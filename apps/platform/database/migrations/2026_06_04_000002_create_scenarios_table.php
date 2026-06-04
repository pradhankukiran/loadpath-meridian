<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scenarios', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignIdFor(\App\Models\Project::class, 'project_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('name');
            $table->string('objective');
            $table->string('engine');
            $table->string('status')->index();
            $table->string('horizon');
            $table->decimal('annual_demand_mwh', 14, 2);
            $table->decimal('peak_load_mw', 10, 2);
            $table->decimal('renewable_share_target', 5, 2);
            $table->json('assumptions')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scenarios');
    }
};
