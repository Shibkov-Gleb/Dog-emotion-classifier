import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noseprint — Dog Emotion Classifier",
  description: "Upload a portrait and get an AI-assisted read of your dog's expression.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
