// Reexporta el cliente único de Supabase para que cada archivo de
// app/src/lib/api/*.ts importe siempre de aquí (nunca directo de
// ../supabase/client) — así las pruebas mockean un solo punto y el día que
// haga falta envolver el cliente (logging, retries, lo que sea) es un
// cambio en un solo lugar.
export { supabase } from '../supabase/client';
