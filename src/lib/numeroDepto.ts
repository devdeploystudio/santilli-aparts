// Número identificador de cada departamento, para que el cliente pueda
// mencionar "el depto 12" sin ambigüedad (varias unidades comparten la
// misma dirección). Se deriva del slug/nombre de archivo ("depto-12-av-
// callao-966" -> 12), el mismo número que ya le asigna en forma
// automática y PERMANENTE rename-new-deptos.mjs al crear una ficha nueva
// - nunca se reutiliza ni se corre al archivar otro depto, así que un
// número mencionado hoy sigue señalando la misma unidad de acá a un año.
// A propósito NO se deriva de "orden" (ese sí cambia cada vez que alguien
// arrastra para reordenar en el panel - serviría para lo opuesto de lo
// que se busca acá).
export function numeroDepto(slugOId: string): number | null {
  const m = slugOId.match(/^depto-(\d+)-/);
  return m ? parseInt(m[1], 10) : null;
}
