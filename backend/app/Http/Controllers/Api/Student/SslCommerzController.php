<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentSetting;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SslCommerzController extends Controller
{
    public function initiate(Request $request)
    {
        $request->validate([
            'month' => ['required', 'string', 'max:30'],
        ]);

        $student = Student::where('user_id', $request->user()->id)
            ->with(['batch.course', 'admission.course', 'user'])
            ->first();

        if (!$student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }

        $courseFee = $this->courseFeeFor($student);
        if ($courseFee <= 0) {
            return response()->json(['message' => 'Course fee is not configured for this student'], 422);
        }

        $month = trim($request->input('month'));
        $alreadyPaid = Payment::where('student_id', $student->id)
            ->whereRaw('LOWER(TRIM(month)) = ?', [strtolower($month)])
            ->where('status', 'paid')
            ->exists();

        if ($alreadyPaid) {
            return response()->json(['message' => 'This month is already paid'], 409);
        }

        $config = $this->sslConfig();
        if (!$config) {
            return response()->json(['message' => 'Payment gateway is not configured by admin'], 422);
        }

        // Clean up any stale non-paid records for this month before creating a fresh one.
        // This prevents duplicate "due" rows piling up when a student cancels and retries.
        Payment::where('student_id', $student->id)
            ->whereRaw('LOWER(TRIM(month)) = ?', [strtolower($month)])
            ->whereIn('status', ['pending', 'due'])
            ->delete();

        $payment = Payment::create([
            'student_id' => $student->id,
            'month' => $month,
            'amount' => $courseFee,
            'trx_id' => $this->transactionId(),
            'method' => 'SSLCommerz',
            'status' => 'pending',
            'date' => now()->toDateString(),
        ]);

        $payload = $this->gatewayPayload($payment, $student, $config);

        try {
            $response = Http::asForm()
                ->timeout(30)
                ->post($this->gatewayUrl($config), $payload);

            $body = $response->json();

            if (($body['status'] ?? null) === 'SUCCESS' && !empty($body['GatewayPageURL'])) {
                $payment->update(['ssl_sessionkey' => $body['sessionkey'] ?? null]);

                return response()->json([
                    'message' => 'Payment initiated',
                    'gateway_url' => $body['GatewayPageURL'],
                    'sessionkey' => $body['sessionkey'] ?? null,
                    'tran_id' => $payment->trx_id,
                    'amount' => $payment->amount,
                    'month' => $payment->month,
                ]);
            }

            Log::error('SSLCommerz initiate failed', [
                'payment_id' => $payment->id,
                'response' => $body,
            ]);

            $payment->update(['status' => 'due']);

            return response()->json([
                'message' => 'Payment gateway error',
                'detail' => $body['failedreason'] ?? 'Unknown error from SSLCommerz',
            ], 400);
        } catch (\Throwable $e) {
            Log::error('SSLCommerz HTTP error: ' . $e->getMessage(), ['payment_id' => $payment->id]);
            $payment->update(['status' => 'due']);

            return response()->json(['message' => 'Cannot connect to payment gateway'], 500);
        }
    }

    public function success(Request $request)
    {
        $payment = $this->paymentFromCallback($request);

        if (!$payment) {
            return $this->redirectToFrontend('failed', null, 'transaction-not-found');
        }

        $verified = $this->verifyAndMarkPaid($payment, $request->all());

        if ($verified) {
            return $this->redirectToFrontend('success', $payment->trx_id, 'verified');
        }

        Log::warning('SSLCommerz validation failed on success callback', [
            'tran_id' => $payment->trx_id,
            'payload' => $request->except(['store_passwd']),
        ]);

        return $this->redirectToFrontend('failed', $payment->trx_id, 'verification-failed');
    }

    public function failed(Request $request)
    {
        $payment = $this->paymentFromCallback($request);

        if ($payment && $payment->status !== 'paid') {
            // If this month already has a successful paid record elsewhere, just delete
            // this stale record instead of keeping it as "due".
            $alreadyPaid = Payment::where('student_id', $payment->student_id)
                ->where('status', 'paid')
                ->whereRaw('LOWER(TRIM(month)) = ?', [strtolower(trim($payment->month))])
                ->where('id', '!=', $payment->id)
                ->exists();

            if ($alreadyPaid) {
                $payment->delete();
            } else {
                $payment->update(['status' => 'due']);
            }
        }

        Log::info('SSLCommerz payment failed', [
            'tran_id' => $request->input('tran_id'),
            'reason' => $request->input('error'),
        ]);

        return $this->redirectToFrontend('failed', $request->input('tran_id'), 'gateway-failed');
    }

    public function cancel(Request $request)
    {
        $payment = $this->paymentFromCallback($request);

        if ($payment && $payment->status !== 'paid') {
            // Same: delete stale record if month is already paid
            $alreadyPaid = Payment::where('student_id', $payment->student_id)
                ->where('status', 'paid')
                ->whereRaw('LOWER(TRIM(month)) = ?', [strtolower(trim($payment->month))])
                ->where('id', '!=', $payment->id)
                ->exists();

            if ($alreadyPaid) {
                $payment->delete();
            } else {
                $payment->update(['status' => 'due']);
            }
        }

        return $this->redirectToFrontend('cancel', $request->input('tran_id'), 'cancelled');
    }

    public function ipn(Request $request)
    {
        Log::info('SSLCommerz IPN received', $request->except(['store_passwd']));

        $payment = $this->paymentFromCallback($request);
        if (!$payment) {
            return response()->json(['status' => 'invalid'], 400);
        }

        if ($this->verifyAndMarkPaid($payment, $request->all())) {
            return response()->json(['status' => 'processed']);
        }

        return response()->json(['status' => 'unverified'], 422);
    }

    public function status(Request $request)
    {
        $request->validate([
            'tran_id' => ['required', 'string'],
        ]);

        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }

        $payment = Payment::where('trx_id', $request->input('tran_id'))
            ->where('student_id', $student->id)
            ->first();

        if (!$payment) {
            return response()->json(['message' => 'Transaction not found'], 404);
        }

        return response()->json([
            'status' => $payment->status,
            'tran_id' => $payment->trx_id,
            'amount' => $payment->amount,
            'month' => $payment->month,
            'method' => $payment->method,
            'date' => $payment->date,
        ]);
    }

    private function verifyAndMarkPaid(Payment $payment, array $payload): bool
    {
        if ($payment->status === 'paid') {
            return true;
        }

        $validated = $this->validateWithSsl($payload);
        if (!$validated) {
            return false;
        }

        $status = strtoupper($validated['status'] ?? '');
        $tranId = $validated['tran_id'] ?? $payload['tran_id'] ?? null;
        $amount = (float) ($validated['amount'] ?? $payload['amount'] ?? $payment->amount);
        $currency = strtoupper($validated['currency'] ?? $payload['currency'] ?? 'BDT');

        $isValidStatus = in_array($status, ['VALID', 'VALIDATED'], true);
        $isSameTransaction = hash_equals((string) $payment->trx_id, (string) $tranId);
        $isSameAmount = abs($amount - (float) $payment->amount) < 0.01;
        $isBdt = $currency === 'BDT';

        if (!$isValidStatus || !$isSameTransaction || !$isSameAmount || !$isBdt) {
            return false;
        }

        $payment->update([
            'status' => 'paid',
            'ssl_val_id' => $validated['val_id'] ?? $payload['val_id'] ?? null,
            'ssl_store_amount' => $validated['store_amount'] ?? null,
            'ssl_card_type' => $validated['card_type'] ?? null,
            'ssl_card_no' => $validated['card_no'] ?? null,
            'date' => now()->toDateString(),
        ]);

        return true;
    }

    private function validateWithSsl(array $data): ?array
    {
        $valId = $data['val_id'] ?? null;
        if (!$valId) {
            return null;
        }

        $config = $this->sslConfig();
        if (!$config) {
            return null;
        }

        try {
            $response = Http::timeout(30)->get($this->validationUrl($config), [
                'val_id' => $valId,
                'store_id' => $config['store_id'],
                'store_passwd' => $config['store_passwd'],
                'format' => 'json',
            ]);

            if (!$response->ok()) {
                Log::warning('SSLCommerz validation returned non-OK response', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return null;
            }

            return $response->json();
        } catch (\Throwable $e) {
            Log::error('SSLCommerz validation HTTP error: ' . $e->getMessage());

            return null;
        }
    }

    private function gatewayPayload(Payment $payment, Student $student, array $config): array
    {
        $user = $student->user;
        $phone = $user->phone ?: $student->guardian_phone ?: '01700000000';
        $address = $student->present_address ?: 'Dhaka, Bangladesh';

        return [
            'store_id' => $config['store_id'],
            'store_passwd' => $config['store_passwd'],
            'total_amount' => $payment->amount,
            'currency' => 'BDT',
            'tran_id' => $payment->trx_id,
            'success_url' => $config['success_url'],
            'fail_url' => $config['failed_url'],
            'cancel_url' => $config['cancel_url'],
            'ipn_url' => $config['ipn_url'],
            'cus_name' => $user->name,
            'cus_email' => $user->email ?: 'student@uttoron.local',
            'cus_add1' => $address,
            'cus_city' => 'Dhaka',
            'cus_state' => 'Dhaka',
            'cus_postcode' => '1207',
            'cus_country' => 'Bangladesh',
            'cus_phone' => $phone,
            'ship_name' => $user->name,
            'ship_add1' => $address,
            'ship_city' => 'Dhaka',
            'ship_state' => 'Dhaka',
            'ship_postcode' => '1207',
            'ship_country' => 'Bangladesh',
            'product_name' => 'Tuition Fee - ' . $payment->month,
            'product_category' => 'Education',
            'product_profile' => 'general',
            'value_a' => (string) $student->id,
            'value_b' => $payment->month,
        ];
    }

    private function paymentFromCallback(Request $request): ?Payment
    {
        $tranId = $request->input('tran_id');
        if (!$tranId) {
            return null;
        }

        return Payment::where('trx_id', $tranId)->first();
    }

    private function redirectToFrontend(string $type, ?string $tranId, string $reason)
    {
        $config = config('services.sslcommerz');
        $baseUrl = match ($type) {
            'success' => $config['frontend_success_url'],
            'cancel' => $config['frontend_cancel_url'],
            default => $config['frontend_failed_url'],
        };

        return redirect()->away($baseUrl . '?' . http_build_query([
            'tran_id' => $tranId,
            'reason' => $reason,
        ]));
    }

    private function courseFeeFor(Student $student): float
    {
        if ($student->batch && $student->batch->course) {
            return (float) $student->batch->course->fee;
        }

        if ($student->admission && $student->admission->course) {
            return (float) $student->admission->course->fee;
        }

        return 0.0;
    }

    private function transactionId(): string
    {
        return 'UCC' . now()->format('YmdHis') . strtoupper(Str::random(6));
    }

    /**
     * Build SSLCommerz config from database settings first.
     * Falls back to config/services.php (i.e. .env values) if the DB row
     * is inactive or incomplete, so the gateway keeps working even before
     * an admin touches the settings page.
     */
    private function sslConfig(): ?array
    {
        $urls = config('services.sslcommerz');

        // 1) Try database-configured settings (admin-managed)
        $setting = PaymentSetting::sslcommerz();
        $enabledMethods = $setting->enabled_methods ?: [];

        $dbActive = $setting->is_active
            && in_array('sslcommerz', $enabledMethods, true)
            && filled($setting->store_id)
            && filled($setting->store_password);

        if ($dbActive) {
            return [
                'store_id' => $setting->store_id,
                'store_passwd' => $setting->store_password,
                'mode' => $setting->mode,
                'success_url' => $urls['success_url'],
                'failed_url' => $urls['failed_url'],
                'cancel_url' => $urls['cancel_url'],
                'ipn_url' => $urls['ipn_url'],
            ];
        }

        // 2) Fallback to .env / config defaults
        $storeId = $urls['store_id'] ?? null;
        $storePasswd = $urls['store_passwd'] ?? null;

        if (blank($storeId) || blank($storePasswd)) {
            return null;
        }

        return [
            'store_id' => $storeId,
            'store_passwd' => $storePasswd,
            'mode' => $urls['mode'] ?? 'sandbox',
            'success_url' => $urls['success_url'],
            'failed_url' => $urls['failed_url'],
            'cancel_url' => $urls['cancel_url'],
            'ipn_url' => $urls['ipn_url'],
        ];
    }

    private function gatewayUrl(array $config): string
    {
        return $this->isLive($config)
            ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
            : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';
    }

    private function validationUrl(array $config): string
    {
        return $this->isLive($config)
            ? 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'
            : 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php';
    }

    private function isLive(array $config): bool
    {
        return ($config['mode'] ?? 'sandbox') === 'live';
    }
}
