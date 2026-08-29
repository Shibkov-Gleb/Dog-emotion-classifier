"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type Probability = {
  label: string;
  probability: number;
};

type Prediction = {
  prediction: string;
  confidence: number;
  probabilities: Probability[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const emotionMeta: Record<string, { eyebrow: string; note: string; color: string }> = {
  angry: {
    eyebrow: "Needs some space",
    note: "Your dog may be feeling tense or overstimulated. Give them a calm, familiar place to settle.",
    color: "#d76048",
  },
  happy: {
    eyebrow: "Looking bright",
    note: "Relaxed eyes and an open expression suggest your dog is feeling comfortable and upbeat.",
    color: "#e1a52b",
  },
  relaxed: {
    eyebrow: "At ease",
    note: "A soft expression suggests your dog feels safe and settled in their surroundings.",
    color: "#43886f",
  },
  sad: {
    eyebrow: "A little low",
    note: "Your dog may be looking subdued. Check in gently and watch for any lasting behavior changes.",
    color: "#687ca3",
  },
};

function formatLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setPreviewUrl(URL.createObjectURL(nextFile));
    setFile(nextFile);
    setResult(null);
    setError(null);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  function handleUploadKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  async function analyze() {
    if (!file || isLoading) return;

    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "The photo could not be analyzed.");
      }

      setResult(data as Prediction);
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? "The classifier is offline. Start the Express API and try again."
          : requestError instanceof Error
            ? requestError.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const primaryMeta = result ? emotionMeta[result.prediction] ?? emotionMeta.relaxed : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="Noseprint home">
          <span className={styles.brandMark} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>Noseprint</span>
        </a>
        <p className={styles.headerNote}>AI-assisted expression reading</p>
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>DOG EMOTION CLASSIFIER</p>
          <h1>What&apos;s behind<br />that look?</h1>
          <p className={styles.intro}>
            Share a clear photo of your dog&apos;s face. Our model reads the expression and returns its best estimate in seconds.
          </p>
          <div className={styles.privacyNote}>
            <span aria-hidden="true">●</span>
            Photos are used only for this analysis
          </div>
        </div>

        <div className={styles.workspace}>
          {!previewUrl ? (
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dragging : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={handleUploadKey}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              aria-label="Upload a dog photo"
            >
              <div className={styles.photoGlyph} aria-hidden="true">
                <span />
              </div>
              <div>
                <h2>Drop a portrait here</h2>
                <p>or click to browse your photos</p>
              </div>
              <span className={styles.fileTypes}>JPG · PNG · WEBP &nbsp; UP TO 10 MB</span>
            </div>
          ) : (
            <div className={styles.previewPanel}>
              <div className={styles.previewImage}>
                <Image src={previewUrl} alt="Selected dog portrait" fill unoptimized sizes="(max-width: 760px) 90vw, 48vw" />
                <span className={styles.scanLine} aria-hidden="true" />
                <button className={styles.replaceButton} type="button" onClick={() => inputRef.current?.click()}>
                  Replace photo
                </button>
              </div>

              {result && primaryMeta ? (
                <div className={styles.results} aria-live="polite">
                  <div className={styles.resultHeading}>
                    <div>
                      <span>{primaryMeta.eyebrow}</span>
                      <h2>{formatLabel(result.prediction)}</h2>
                    </div>
                    <strong style={{ color: primaryMeta.color }}>
                      {Math.round(result.confidence * 100)}%
                      <small>confidence</small>
                    </strong>
                  </div>
                  <p className={styles.resultNote}>{primaryMeta.note}</p>
                  <div className={styles.scores}>
                    {result.probabilities.map((item) => (
                      <div className={styles.score} key={item.label}>
                        <div>
                          <span>{formatLabel(item.label)}</span>
                          <span>{Math.round(item.probability * 100)}%</span>
                        </div>
                        <div className={styles.track}>
                          <span style={{ width: `${Math.max(item.probability * 100, 2)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className={styles.secondaryButton} type="button" onClick={reset}>Analyze another photo</button>
                </div>
              ) : (
                <div className={styles.actionArea}>
                  <div>
                    <span>PHOTO READY</span>
                    <p>{file?.name}</p>
                  </div>
                  <button className={styles.analyzeButton} type="button" onClick={analyze} disabled={isLoading}>
                    {isLoading ? <><span className={styles.spinner} /> Reading expression…</> : <>Analyze expression <span>→</span></>}
                  </button>
                </div>
              )}
            </div>
          )}

          <input ref={inputRef} className={styles.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp,image/bmp,image/gif" onChange={handleInput} />
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
      </section>

      <section className={styles.guidance} aria-label="Photo guidance">
        <p>FOR A BETTER READ</p>
        <div className={styles.tips}>
          <article><span>01</span><div><h3>Face the camera</h3><p>Keep both eyes and the muzzle visible.</p></div></article>
          <article><span>02</span><div><h3>Use natural light</h3><p>Avoid deep shadows across the face.</p></div></article>
          <article><span>03</span><div><h3>Get close</h3><p>Let your dog fill most of the frame.</p></div></article>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Noseprint is an experimental classifier, not a veterinary diagnosis.</p>
        <span>BUILT WITH CARE FOR CURIOUS DOG PEOPLE</span>
      </footer>
    </main>
  );
}
