"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function TestPage() {
  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase
        .from("departments")
        .select("*");

      console.log("Data:", data);
      console.log("Error:", error);
    }

    testConnection();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Supabase Connection Test</h1>
      <p>Open Developer Console (F12).</p>
    </div>
  );
}