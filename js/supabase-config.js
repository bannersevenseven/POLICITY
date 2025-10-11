import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  "https://qvuekjrwsqdobyzefnda.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dWVranJ3c3Fkb2J5emVmbmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMDIwNTYsImV4cCI6MjA3NTU3ODA1Nn0.7BIdtTS9cdH-u5FG83wcv7HgD8Ht8i5Amui9ThjROMU"
);
window.supabase = supabase;