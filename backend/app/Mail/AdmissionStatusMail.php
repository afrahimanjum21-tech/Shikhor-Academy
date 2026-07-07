<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AdmissionStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    public $details;

    public function __construct($details)
    {
        $this->details = $details;
    }

    public function build()
    {
        $subject = 'Admission Update - Uttoron Coaching';
        
        if ($this->details['status'] === 'approved') {
            $subject = 'Congratulations! Admission Approved';
        } elseif ($this->details['status'] === 'rejected') {
            $subject = 'Admission Application Update';
        } elseif ($this->details['status'] === 'hold') {
            $subject = 'Admission Application On Hold';
        }

        return $this->subject($subject)
                    ->view('emails.admission_status');
    }
}