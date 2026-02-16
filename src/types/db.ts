export interface TemplateRow {
    id: string;
    name: string;
    data: any; // Template JSON
    user_id?: string;
    created_at: string;
    updated_at: string;
}

export interface ApiKeyRow {
    id: string;
    user_id: string;
    name: string;
    key_prefix: string;
    key_hash: string;
    last_used_at?: string;
    created_at: string;
}

export interface RenderRow {
    id: string;
    user_id?: string;
    template_id?: string;
    project_id?: string;
    render_job_id?: string;
    source: 'ui' | 'api';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    resolution?: string;
    output_url?: string;
    error_message?: string;
    metadata?: Record<string, any>;
    created_at: string;
}
