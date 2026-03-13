"use client";

import { Thermometer, Droplets, Wifi, WifiOff, Clock } from "lucide-react";
import type { Sensor } from "@/lib/api";

interface SensorCardProps {
  sensor: Sensor;
  isSelected: boolean;
  onClick: () => void;
}

export function SensorCard({ sensor, isSelected, onClick }: SensorCardProps) {
  const temp = sensor.latest?.temperature;
  const hum = sensor.latest?.humidity;
  const rssi = sensor.latest?.rssi;

  // Format time since last seen
  const lastSeenAgo = () => {
    const seconds = Math.floor(Date.now() / 1000 - sensor.last_seen);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all duration-200 hover:border-emerald-500/50
        ${isSelected
          ? "border-emerald-500/70 bg-emerald-950/20 shadow-lg shadow-emerald-500/5"
          : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80"
        }`}
    >
      {/* Header: name + status */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
          {sensor.name}
        </h3>
        <div className="flex items-center gap-1.5">
          {sensor.online ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            </div>
          )}
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-2 gap-3">
        {/* Temperature */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
            <Thermometer className="w-3 h-3" />
            <span>Temp</span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
            {temp ? (
              <>
                {temp.value.toFixed(1)}
                <span className="text-sm text-zinc-500 ml-0.5">°C</span>
              </>
            ) : (
              <span className="text-zinc-600">--</span>
            )}
          </div>
        </div>

        {/* Humidity */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
            <Droplets className="w-3 h-3" />
            <span>Humidity</span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
            {hum ? (
              <>
                {hum.value.toFixed(1)}
                <span className="text-sm text-zinc-500 ml-0.5">%</span>
              </>
            ) : (
              <span className="text-zinc-600">--</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: last seen + RSSI */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/50">
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <Clock className="w-3 h-3" />
          <span>{lastSeenAgo()}</span>
        </div>
        {rssi && (
          <div className="text-[10px] text-zinc-600 font-mono">
            {rssi.value.toFixed(0)} dBm
          </div>
        )}
      </div>
    </button>
  );
}
