-- Create payment_links table
CREATE TABLE IF NOT EXISTS payment_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'gbp',
    recurring BOOLEAN DEFAULT FALSE,
    client_secret TEXT NOT NULL,
    stripe_payment_intent_id TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_active ON payment_links(active);

-- Enable Row Level Security
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payment links" ON payment_links;
DROP POLICY IF EXISTS "Users can insert their own payment links" ON payment_links;
DROP POLICY IF EXISTS "Users can update their own payment links" ON payment_links;
DROP POLICY IF EXISTS "Users can delete their own payment links" ON payment_links;
DROP POLICY IF EXISTS "Public can view active payment links by ID" ON payment_links;

-- Create policies
CREATE POLICY "Users can view their own payment links"
    ON payment_links FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Public can view active payment links by ID"
    ON payment_links FOR SELECT
    USING (active = true);

CREATE POLICY "Users can insert their own payment links"
    ON payment_links FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment links"
    ON payment_links FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment links"
    ON payment_links FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_payment_links_updated_at ON payment_links;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payment_links_updated_at
    BEFORE UPDATE ON payment_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
