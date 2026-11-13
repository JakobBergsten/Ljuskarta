export function hasLoadedTileAt(images,zoom,x,y) {
  return Array.from(images).some(image=>{
    if(!image.complete||image.naturalWidth===0||!image.src.startsWith(`https://tile.openstreetmap.org/${zoom}/`))return false;
    const box=image.getBoundingClientRect();
    return x>=box.left&&x<box.right&&y>=box.top&&y<box.bottom;
  });
}
