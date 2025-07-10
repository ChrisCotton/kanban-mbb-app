-- Migration 017: Create weather_data table for calendar integration
-- This table stores daily weather information fetched from external APIs

-- Create weather_data table
CREATE TABLE IF NOT EXISTS public.weather_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    location_name VARCHAR(255) NOT NULL DEFAULT 'Sacramento, CA',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    temperature_current INTEGER,
    temperature_min INTEGER,
    temperature_max INTEGER,
    weather_description VARCHAR(255),
    weather_icon VARCHAR(50),
    humidity INTEGER,
    wind_speed INTEGER,
    precipitation DECIMAL(5, 2) DEFAULT 0,
    source VARCHAR(50) DEFAULT 'open-meteo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one weather entry per user per date per location
    UNIQUE(user_id, date, location_name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_weather_data_user_date ON public.weather_data(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weather_data_date ON public.weather_data(date);
CREATE INDEX IF NOT EXISTS idx_weather_data_location ON public.weather_data(latitude, longitude);

-- Enable Row Level Security (RLS)
ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own weather data
CREATE POLICY "Users can view their own weather data" ON public.weather_data
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own weather data
CREATE POLICY "Users can insert their own weather data" ON public.weather_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own weather data
CREATE POLICY "Users can update their own weather data" ON public.weather_data
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own weather data
CREATE POLICY "Users can delete their own weather data" ON public.weather_data
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_weather_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on weather_data table
CREATE TRIGGER update_weather_data_updated_at 
    BEFORE UPDATE ON public.weather_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_weather_data_updated_at();

-- Add helpful comments
COMMENT ON TABLE public.weather_data IS 'Stores daily weather information for calendar integration';
COMMENT ON COLUMN public.weather_data.source IS 'Weather data source (e.g., open-meteo, openweathermap)';
COMMENT ON COLUMN public.weather_data.weather_icon IS 'Weather icon code for UI display';
COMMENT ON COLUMN public.weather_data.precipitation IS 'Daily precipitation in millimeters'; 