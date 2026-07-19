<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Convert existing decimal values to integers (rounding to nearest whole number)
        DB::statement('UPDATE assignments SET total_marks = ROUND(total_marks)');
    }

    public function down(): void
    {
        // Nothing to revert — data was already integer-like
    }
};
