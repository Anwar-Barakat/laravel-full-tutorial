<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class OrderPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view-any-order');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Order $order): bool
    {
        // Users can view their own orders, or admin can view any order
        return $user->id === $order->user_id || $user->can('view-order');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('create-order');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Order $order): bool
    {
        // Users can update their own pending orders, or admin can update any order
        return ($user->id === $order->user_id && $order->status === 'pending') || $user->can('update-order');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Order $order): bool
    {
        // Users can delete their own pending orders, or admin can delete any order
        return ($user->id === $order->user_id && $order->status === 'pending') || $user->can('delete-order');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Order $order): bool
    {
        return $user->can('restore-order'); // Assuming a 'restore-order' permission for soft deletes
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Order $order): bool
    {
        return $user->can('force-delete-order'); // Assuming a 'force-delete-order' permission
    }
}