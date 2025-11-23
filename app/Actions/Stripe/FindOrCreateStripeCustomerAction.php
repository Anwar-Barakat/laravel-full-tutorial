<?php

namespace App\Actions\Stripe;

use App\Models\User;
use Stripe\Customer;
use Stripe\Stripe;
use Illuminate\Support\Facades\Log;
use Throwable;

class FindOrCreateStripeCustomerAction
{
    public function __construct()
    {
        Stripe::setApiKey(env('STRIPE_SECRET'));
    }

    public function execute(User $user): Customer
    {
        if ($user->stripe_customer_id) {
            try {
                return Customer::retrieve($user->stripe_customer_id);
            } catch (Throwable $e) {
                Log::warning("Stripe Customer {$user->stripe_customer_id} not found, creating a new one for user {$user->id}. Error: " . $e->getMessage());
            }
        }

        $stripeCustomer = Customer::create([
            'email' => $user->email,
            'name' => $user->name,
            'metadata' => ['user_id' => $user->id],
        ]);

        $user->forceFill([
            'stripe_customer_id' => $stripeCustomer->id,
        ])->save();

        return $stripeCustomer;
    }
}
