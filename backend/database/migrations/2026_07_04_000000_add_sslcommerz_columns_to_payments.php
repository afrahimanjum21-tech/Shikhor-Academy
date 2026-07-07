<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('payments', function (Blueprint $table) {
            // SSLCommerz এর জন্য নতুন কলাম
            $table->string('ssl_sessionkey')->nullable()->after('trx_id');
            $table->string('ssl_val_id')->nullable()->after('ssl_sessionkey');
            $table->string('ssl_store_amount')->nullable()->after('ssl_val_id');
            $table->string('ssl_card_type')->nullable()->after('ssl_store_amount');
            $table->string('ssl_card_no')->nullable()->after('ssl_card_type');
            // status enum এ pending যোগ করা হয়ে গেছে (paid, due, pending ইতিমধ্যে আছে)
        });
    }

    public function down()
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'ssl_sessionkey', 'ssl_val_id', 'ssl_store_amount', 'ssl_card_type', 'ssl_card_no'
            ]);
        });
    }
};
