<!DOCTYPE html>
<html>
<head>
    <title>Admission Update</title>
    <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .header { background-color: #1F4F78; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .status { font-weight: bold; text-transform: uppercase; color: #1F4F78; }
        .creds { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #1F4F78; }
        .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
        .btn { display: inline-block; background-color: #1F4F78; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
        .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    </style>
</head>
<body>
    @php($siteSettings = \App\Models\SiteSetting::instance())
    <div class="container">
        <div class="header">
            <h2>{{ $siteSettings->site_name ?: 'Uttoron Coaching Center' }}</h2>
        </div>
        <div class="content">
            <p>Dear <strong>{{ $details['name'] }}</strong>,</p>
            
            <p>Your admission request for the course <strong>{{ $details['course'] }}</strong> has been updated to: <span class="status">{{ $details['status'] }}</span>.</p>

            @if($details['status'] == 'approved')
                <p>We are excited to have you with us! Use the following credentials to login to your Student Portal:</p>
                
                <div class="creds">
                    <p><span class="label">Login Email:</span><br><strong>{{ $details['login_email'] }}</strong></p>
                    <p><span class="label">Password:</span><br><strong>{{ $details['password'] }}</strong></p>
                </div>

                <p>Please login and keep your password safe.</p>
                <center>
                    <a href="{{ config('app.url') }}/login" class="btn">Login to Portal</a>
                </center>
            @elseif($details['status'] == 'hold')
                <p>We need a bit more time to review your application or verify your payment. We will notify you soon.</p>
            @else
                <p>Unfortunately, we cannot proceed with your admission at this moment. Please contact our office for details.</p>
            @endif
        </div>
        <div class="footer">
            <p>&copy; {{ date('Y') }} {{ $siteSettings->site_name ?: 'Uttoron Coaching Center' }}. All rights reserved.</p>
            <p>{{ $siteSettings->address ?: \App\Models\SiteSetting::DEFAULT_ADDRESS }}</p>
        </div>
    </div>
</body>
</html>
