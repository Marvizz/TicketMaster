import React, { useState, useRef, useEffect } from 'react';

const DraggableQRCode = ({ src, size, limit, onDrag }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragItem = useRef();

  const onMouseDown = (e) => {
    isDragging.current = true;
    dragItem.current = {
      initialX: e.clientX - position.x,
      initialY: e.clientY - position.y,
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (isDragging.current) {
      let newX = e.clientX - dragItem.current.initialX;
      let newY = e.clientY - dragItem.current.initialY;
      newX = Math.max(0, Math.min(newX, limit.width - size)); 
      newY = Math.max(0, Math.min(newY, limit.height - size));

      setPosition({ x: newX, y: newY });
      onDrag && onDrag({ x: newX, y: newY });
    }
  };

  const onMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        cursor: 'grab',
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        userSelect: 'none',
      }}
    >
      <img src={src} alt="QR Code" draggable="false" style={{ width: `${size}px`, height: `${size}px` }} />
    </div>
  );
};

export default DraggableQRCode;