import type { GraphData } from '../graph/graphTypes';

/**
 * Downloads serialized SVG text file
 */
export function exportToSvg(svgElement: SVGSVGElement, filename: string) {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // Inject proper XML namespaces if missing
  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.match(/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  const xmlHeader = '<?xml version="1.0" encoding="utf-8"?>\n';
  const blob = new Blob([xmlHeader + source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.toLowerCase().endsWith('.svg') ? filename : `${filename}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Renders SVG canvas to PNG using HTML5 canvas
 */
export function exportToPng(svgElement: SVGSVGElement, filename: string) {
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgElement);

  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  const bbox = svgElement.getBoundingClientRect();

  // Establish bounds
  img.width = bbox.width || 1200;
  img.height = bbox.height || 800;

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background fill matching deep-slate themes
      ctx.fillStyle = '#090f19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
        }
      }, 'image/png');
    }
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

/**
 * Exports clean graph data structured into a JSON format
 */
export function exportToJson(graphData: GraphData, filename: string) {
  const cleanedNodes = graphData.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    type: n.type,
    path: n.path,
    size: n.size,
    cluster: n.cluster,
  }));

  const cleanedLinks = graphData.links.map((l) => ({
    id: l.id,
    source: typeof l.source === 'object' ? l.source.id : l.source,
    target: typeof l.target === 'object' ? l.target.id : l.target,
    type: l.type,
  }));

  const data = JSON.stringify({ nodes: cleanedNodes, links: cleanedLinks }, null, 2);
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
