import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Button } from './ui/button';
import { MapPin, Navigation } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationPickerProps {
  position: { lat: number; lng: number } | null;
  onPositionChange: (pos: { lat: number; lng: number }) => void;
}

function LocationMarker({ position, onPositionChange }: LocationPickerProps) {
  const map = useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={customIcon} />
  );
}

export function LocationPicker({ position, onPositionChange }: LocationPickerProps) {
  const { language } = useAppStore();
  const [mapRef, setMapRef] = useState<L.Map | null>(null);

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(l('ໂປຣແກຣມທ່ອງເວັບຂອງທ່ານບໍ່ຮອງຮັບສະຖານທີ່', 'เบราว์เซอร์ของคุณไม่รองรับพิกัด', 'Geolocation is not supported'));
      return;
    }
    
    // show a small alert or loading state here optionally
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const latlng = { lat: latitude, lng: longitude };
      onPositionChange(latlng);
      if (mapRef) {
        mapRef.flyTo(latlng, 15);
      }
    }, () => {
      alert(l('ບໍ່ສາມາດດຶງສະຖານທີ່ໄດ້', 'ไม่สามารถดึงตำแหน่งได้', 'Failed to get location'));
    });
  };

  const defaultCenter = { lat: 17.9757, lng: 102.6331 }; // Vientiane

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-1">
          <MapPin className="h-4 w-4" /> 
          {l('ຕຳແໜ່ງໃນແຜນທີ່', 'ตำแหน่งในแผนที่', 'Map Location')}
        </label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleGetCurrentLocation}
          className="gap-1 h-8"
        >
          <Navigation className="h-3 w-3" />
          <span className="text-xs">{l('ປັດຈຸບັນ', 'ปัจจุบัน', 'Current')}</span>
        </Button>
      </div>
      <div className="h-[250px] w-full rounded-md overflow-hidden border">
        <MapContainer 
          center={position || defaultCenter} 
          zoom={13} 
          scrollWheelZoom={false} 
          style={{ height: '100%', width: '100%', zIndex: 10 }}
          ref={setMapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} onPositionChange={onPositionChange} />
        </MapContainer>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        {l('ຄລິກໃສ່ແຜນທີ່ເພື່ອປັກໝຸດຕຳແໜ່ງທີ່ຕ້ອງການ', 'คลิกบนแผนที่เพื่อปักหมุดตำแหน่งที่ต้องการ', 'Click on the map to drop a pin')}
      </p>
    </div>
  );
}
