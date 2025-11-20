<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->string('stripe_checkout_session_id')->nullable()->unique();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3); // e.g., USD
            $table->string('status'); // e.g., pending, paid, failed, cancelled
            $table->string('payment_method')->nullable(); // e.g., card, alipay
            $table->json('metadata')->nullable(); // For storing any additional Stripe metadata
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};