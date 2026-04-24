const LINE_SEP_PATTERN = new RegExp('\\u2028', 'g');
const PARA_SEP_PATTERN = new RegExp('\\u2029', 'g');

function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEP_PATTERN, '\\u2028')
    .replace(PARA_SEP_PATTERN, '\\u2029');
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeJsonForScript(JSON.stringify(data)) }}
    />
  );
}
