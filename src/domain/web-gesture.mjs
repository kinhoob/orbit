// Extrai o ponto (pageX/pageY) de um evento de toque/click na web: o
// PanResponder do react-native-web normaliza nativeEvent, mas o onTouchStart
// da View entrega o TouchEvent cru (touches/changedTouches).
export function webPoint(nativeEvent) {
  if (!nativeEvent || typeof nativeEvent !== 'object') return null;
  const src = (nativeEvent.touches && nativeEvent.touches[0])
    || (nativeEvent.changedTouches && nativeEvent.changedTouches[0])
    || nativeEvent;
  const x = src.pageX;
  const y = src.pageY;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}
