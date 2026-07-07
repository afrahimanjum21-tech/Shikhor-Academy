<!DOCTYPE html>
<html>
<head>
    <title>New Admission Application</title>
    <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .header { background-color: #1F4F78; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .info { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #1F4F78; }
        .info p { margin: 6px 0; }
        .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
        .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
        .btn { display: inline-block; background-color: #1F4F78; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Uttoron Coaching Center</h2>
            <p style="margin:5px 0 0 0; font-size:14px; opacity:0.9;">New Admission Application Received</p>
        </div>
        <div class="content">
            <p>A new student has applied for admission. Here are the details:</p>

            <div class="info">
                <p><span class="label">Student Name:</span><br><strong>{{ $details['name'] }}</strong></p>
                <p><span class="label">Phone:</span><br><strong>{{ $details['phone'] }}</strong></p>
                <p><span class="label">Email:</span><br><strong>{{ $details['email'] }}</strong></p>
                <p><span class="label">Applied Course:</span><br><strong>{{ $details['course'] }}</strong></p>
                <p><span class="label">Application ID:</span><br><strong>#{{ $details['application_id'] }}</strong></p>
                <p><span class="label">Submitted:</span><br><strong>{{ $details['date'] }}</strong></p>
            </div>

            <p>Please log in to the Admin Panel to review and process this application.</p>
            <center>
                <a href="{{ $details['admin_url'] }}/admin/admissions" class="btn">Go to Admin Panel</a>
            </center>
        </div>
        <div class="footer">
            <p>&copy; {{ date('Y') }} Uttoron Coaching Center. All rights reserved.</p>
            <p>Mirpur-10, Dhaka, Bangladesh</p>
        </div>
    </div>
</body>
</html>
