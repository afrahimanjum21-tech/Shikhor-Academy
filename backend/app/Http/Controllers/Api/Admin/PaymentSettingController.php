<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentSettingController extends Controller
{
    public function show()
    {
        $setting = PaymentSetting::sslcommerz();

        return response()->json([
            'provider' => $setting->provider,
            'is_active' => $setting->is_active,
            'mode' => $setting->mode,
            'store_id' => $setting->store_id,
            'has_store_password' => filled($setting->store_password),
            'enabled_methods' => $setting->enabled_methods ?: ['sslcommerz'],
            'settlement_account_name' => $setting->settlement_account_name,
            'settlement_account_number' => $setting->settlement_account_number,
            'settlement_bank_name' => $setting->settlement_bank_name,
            'instructions' => $setting->instructions,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
            'mode' => ['required', Rule::in(['sandbox', 'live'])],
            'store_id' => ['required_if:is_active,true', 'nullable', 'string', 'max:120'],
            'store_password' => ['nullable', 'string', 'max:255'],
            'enabled_methods' => ['required', 'array', 'min:1'],
            'enabled_methods.*' => [Rule::in(['sslcommerz'])],
            'settlement_account_name' => ['nullable', 'string', 'max:120'],
            'settlement_account_number' => ['nullable', 'string', 'max:120'],
            'settlement_bank_name' => ['nullable', 'string', 'max:120'],
            'instructions' => ['nullable', 'string', 'max:1000'],
        ]);

        $setting = PaymentSetting::sslcommerz();

        $setting->fill([
            'is_active' => $validated['is_active'],
            'mode' => $validated['mode'],
            'store_id' => $validated['store_id'] ?? null,
            'enabled_methods' => $validated['enabled_methods'],
            'settlement_account_name' => $validated['settlement_account_name'] ?? null,
            'settlement_account_number' => $validated['settlement_account_number'] ?? null,
            'settlement_bank_name' => $validated['settlement_bank_name'] ?? null,
            'instructions' => $validated['instructions'] ?? null,
        ]);

        if (filled($request->input('store_password'))) {
            $setting->store_password = $request->input('store_password');
        }

        $setting->save();

        return response()->json([
            'message' => 'Payment settings updated successfully',
            'settings' => [
                'provider' => $setting->provider,
                'is_active' => $setting->is_active,
                'mode' => $setting->mode,
                'store_id' => $setting->store_id,
                'has_store_password' => filled($setting->store_password),
                'enabled_methods' => $setting->enabled_methods,
                'settlement_account_name' => $setting->settlement_account_name,
                'settlement_account_number' => $setting->settlement_account_number,
                'settlement_bank_name' => $setting->settlement_bank_name,
                'instructions' => $setting->instructions,
            ],
        ]);
    }
}
