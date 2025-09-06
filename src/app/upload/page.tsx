"use client";

import { useState } from "react";

export default function UploadPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [sample, setSample] = useState<unknown[][]>([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");

  // Handles preview
  async function handlePreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setMessage("❌ Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload/preview", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setHeaders(data.headers);
      setSample(data.sample);
      setMessage("✅ File uploaded successfully");
    } else {
      let errMsg = "Unknown error";
      try {
        const err = await res.json();
        errMsg = err.error || JSON.stringify(err);
      } catch {
        errMsg = await res.text();
      }
      setMessage("❌ " + errMsg);
    }
  }

  // Handles ingest (saving to DB)
  async function handleIngest() {
    if (!file || !label) {
      setMessage("❌ Missing file or month label");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", label);

    const res = await fetch("/api/upload/ingest", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      console.log("Ingest result:", data);
      setMessage("✅ Imported into month " + label);
    } else {
      let errMsg = "Unknown error";
      try {
        const err = await res.json();
        errMsg = err.error || JSON.stringify(err);
      } catch {
        errMsg = await res.text();
      }
      setMessage("❌ " + errMsg);
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Upload Checklist</h1>
      <form onSubmit={handlePreview}>
        <input
          type="file"
          name="file"
          accept=".xlsx,.csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button type="submit">Preview</button>
      </form>

      {message && <p>{message}</p>}

      {headers.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h2>Detected Headers</h2>
          <ul>
            {headers.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>

          <h2>Sample Rows</h2>
          <table border={1} cellPadding={5}>
            <tbody>
              {sample.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{String(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "20px" }}>
            <label>
              Month Label (YYYY-MM):{" "}
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="2025-09"
              />
            </label>
            <button type="button" onClick={handleIngest}>
              Import to DB
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
