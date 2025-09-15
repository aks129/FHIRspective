# Database Setup Instructions

To fix the 500 error, you need to set up a PostgreSQL database. Here are your options:

## Option 1: Neon (Recommended - Free & Fast)

1. Go to https://neon.tech and sign up for a free account
2. Create a new project called "fhirspective"
3. Copy the connection string (it will look like: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname`)
4. Add it to Vercel:
   ```bash
   vercel env add DATABASE_URL production
   # Paste your connection string when prompted
   ```

## Option 2: Vercel Postgres

1. Go to your Vercel dashboard: https://vercel.com/aks129s-projects/fhirspective
2. Click on "Storage" tab
3. Click "Create Database" → "Postgres"
4. Follow the setup wizard
5. It will automatically add the DATABASE_URL to your project

## Option 3: Supabase (Free tier available)

1. Go to https://supabase.com and create an account
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string
5. Add to Vercel as shown in Option 1

## After adding the database URL:

1. Redeploy your application:
   ```bash
   vercel --prod
   ```

2. Run database migrations:
   ```bash
   npm run db:push
   ```

Your app should then work without the 500 error!