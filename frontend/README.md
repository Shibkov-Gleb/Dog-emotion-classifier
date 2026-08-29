# Noseprint frontend

Next.js interface for the dog emotion classifier.

## Run locally

Start the Express API from the repository's `backend` directory, then run:

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend sends photos to
`http://localhost:4000/api/predict` by default. Set `NEXT_PUBLIC_API_URL` in
`.env.local` when the API uses a different address.

## Production check

```bash
npm run build
```
