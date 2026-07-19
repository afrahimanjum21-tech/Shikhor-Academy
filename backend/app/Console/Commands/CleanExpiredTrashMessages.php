<?php

namespace App\Console\Commands;

use App\Models\ContactMessage;
use Illuminate\Console\Command;

class CleanExpiredTrashMessages extends Command
{
    protected $signature = 'app:clean-expired-trash-messages';
    protected $description = 'Permanently delete messages that have been in trash for more than 30 days';

    public function handle()
    {
        $cutoff = now()->subDays(30);

        $count = ContactMessage::onlyTrashed()
            ->where('deleted_at', '<', $cutoff)
            ->forceDelete();

        $this->info("Permanently deleted {$count} expired trashed message(s).");

        return Command::SUCCESS;
    }
}
