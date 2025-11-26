<?php

namespace Tests\Feature\Api;

abstract class BaseOrderCrudApiTest extends BaseOrderApiTest
{
    protected string $apiVersion = 'v14';

    protected function getBaseUrl(): string
    {
        return "/api/{$this->apiVersion}/orders";
    }
}
