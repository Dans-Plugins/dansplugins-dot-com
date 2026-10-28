#!/usr/bin/env bash
# encode.sh FRAMES_DIR FPS WIDTH HEIGHT POSTER_FRAME OUT_BASE [MAX_BYTES]
# VP9 webm + H.264 faststart mp4 (CRF ladder until under MAX_BYTES) + JPG poster.
set -euo pipefail
F=$1 FPS=$2 W=$3 H=$4 PF=$5 OUT=$6 MAX=${7:-300000}
FF=${FFMPEG:-ffmpeg}
VF="scale=${W}:${H}:flags=lanczos,format=yuv420p"
mkdir -p "$(dirname "$OUT")"
for crf in 34 38 42 46 50; do
  "$FF" -v error -y -framerate "$FPS" -i "$F/f%04d.png" -vf "$VF" -an -c:v libvpx-vp9 -b:v 0 -crf $crf -row-mt 1 -deadline good -cpu-used 2 -g $((FPS*4)) "$OUT.webm"
  [ "$(stat -c%s "$OUT.webm")" -lt "$MAX" ] && break
done
for crf in 26 29 32 35 38; do
  "$FF" -v error -y -framerate "$FPS" -i "$F/f%04d.png" -vf "$VF" -an -c:v libx264 -preset slow -crf $crf -profile:v high -pix_fmt yuv420p -movflags +faststart -g $((FPS*4)) "$OUT.mp4"
  [ "$(stat -c%s "$OUT.mp4")" -lt "$MAX" ] && break
done
for q in 4 6 8 10; do
  "$FF" -v error -y -i "$F/$(printf 'f%04d.png' "$PF")" -vf "scale=${W}:${H}:flags=lanczos" -q:v $q "$OUT.jpg"
  [ "$(stat -c%s "$OUT.jpg")" -lt 90000 ] && break
done
ls -l "$OUT".{webm,mp4,jpg} | awk '{print $5, $9}'
