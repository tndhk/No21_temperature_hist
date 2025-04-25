"use client";
import { useState } from "react";

export function ETLButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const triggerETL = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/etl", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setMessage(`完了: ${json.detail.message}`);
      } else {
        setMessage(`エラー: ${json.error}`);
      }
    } catch (e) {
      setMessage(`例外: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-4">
      <button
        onClick={triggerETL}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "処理中..." : "データ取得"}
      </button>
      {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
    </div>
  );
} 