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
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // Link to User
            $table->string('stripe_checkout_session_id')->nullable()->unique();
            $table->string('payment_intent_id')->nullable()->unique();
            $table->string('stripe_charge_id')->nullable()->unique(); // ID of the Stripe Charge
            $table->decimal('amount', 10, 2); // Original amount of the payment intent
            $table->decimal('amount_captured', 10, 2)->nullable(); // Actual captured amount
            $table->string('currency', 3); // e.g., USD
            $table->string('currency_captured', 3)->nullable(); // Currency of captured amount
            $table->string('status'); // e.g., pending, paid, failed, cancelled
            $table->string('payment_method')->nullable(); // deprecated in favor of payment_method_type
            $table->string('payment_method_type')->nullable(); // e.g., 'card', 'us_bank_account'
            $table->string('card_brand')->nullable(); // e.g., 'visa', 'mastercard'
            $table->string('card_last_four')->nullable(); // last four digits of the card
            $table->string('stripe_balance_transaction_id')->nullable()->unique(); // ID of the Stripe Balance Transaction
            $table->decimal('net_amount', 10, 2)->nullable(); // amount after fees
            $table->decimal('fees_amount', 10, 2)->nullable(); // Stripe fees
            $table->timestamp('available_on')->nullable(); // when funds become available
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