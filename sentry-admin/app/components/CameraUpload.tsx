'use client'

import React, { useEffect, useRef, useState } from 'react'

type CameraUploadProps = {
  label: string
  multiple?: boolean
  maxFiles?: number
  maxSizeMb?: number
  value?: File[]
  onChange: (files: File[]) => void
}

export default function CameraUpload({
  label,
  multiple = false,
  maxFiles = 1,
  maxSizeMb = 3,
  value,
  onChange,
}: CameraUploadProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [files, setFiles] = useState<File[]>(value || [])
  const [previews, setPreviews] = useState<string[]>([])

  const maxSizeByte = maxSizeMb * 1024 * 1024

  const syncFiles = (nextFiles: File[]) => {
    setFiles(nextFiles)
    onChange(nextFiles)

    previews.forEach((url) => URL.revokeObjectURL(url))

    const nextPreviews = nextFiles.map((file) => URL.createObjectURL(file))
    setPreviews(nextPreviews)
  }

  const validateFiles = (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return false

    const total = multiple ? files.length + incomingFiles.length : incomingFiles.length

    if (total > maxFiles) {
      alert(`Maksimal ${maxFiles} foto`)
      return false
    }

    const invalidType = incomingFiles.find((file) => !file.type.startsWith('image/'))

    if (invalidType) {
      alert('File harus berupa gambar')
      return false
    }

    const invalidSize = incomingFiles.find((file) => file.size > maxSizeByte)

    if (invalidSize) {
      alert(`Ukuran foto maksimal ${maxSizeMb}MB`)
      return false
    }

    return true
  }

  const addFiles = (incomingFiles: File[]) => {
    if (!validateFiles(incomingFiles)) return

    const nextFiles = multiple ? [...files, ...incomingFiles] : incomingFiles.slice(0, 1)

    syncFiles(nextFiles)
  }

  const removeFile = (index: number) => {
    const nextFiles = files.filter((_, i) => i !== index)
    syncFiles(nextFiles)
  }

  const openCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Browser tidak mendukung kamera langsung')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
        },
        audio: false,
      })

      streamRef.current = stream
      setCameraOpen(true)

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 100)
    } catch {
      alert('Kamera tidak bisa dibuka. Pastikan izin kamera sudah diizinkan.')
    }
  }

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    setCameraOpen(false)
  }

  const takePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return

    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, width, height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return

        const file = new File([blob], `foto-kamera-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })

        addFiles([file])
        closeCamera()
      },
      'image/jpeg',
      0.92
    )
  }

  useEffect(() => {
    if (value) {
      setFiles(value)
    }
  }, [value])

  useEffect(() => {
    return () => {
      closeCamera()
      previews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  return (
    <div style={{ width: '100%' }}>
      <label
        style={{
          display: 'block',
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 10,
          color: '#1e293b',
        }}
      >
        {label}
      </label>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
        }}
      >
        <label
          style={{
            minHeight: 90,
            border: '2px dashed #cbd5e1',
            borderRadius: 12,
            background: '#f8fafc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 6,
            color: '#334155',
            fontWeight: 700,
            textAlign: 'center',
            padding: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>📁</span>
          <span>Pilih File</span>

          <input
            type="file"
            accept="image/*"
            multiple={multiple}
            hidden
            onChange={(e) => {
              const selectedFiles = Array.from(e.target.files || [])
              addFiles(selectedFiles)
              e.target.value = ''
            }}
          />
        </label>

        <label
          style={{
            minHeight: 90,
            border: '2px dashed #60a5fa',
            borderRadius: 12,
            background: '#eff6ff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 6,
            color: '#1d4ed8',
            fontWeight: 700,
            textAlign: 'center',
            padding: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>📱</span>
          <span>Kamera HP / Tablet</span>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const selectedFiles = Array.from(e.target.files || [])
              addFiles(selectedFiles)
              e.target.value = ''
            }}
          />
        </label>

        <button
          type="button"
          onClick={openCamera}
          style={{
            minHeight: 90,
            border: '2px dashed #10b981',
            borderRadius: 12,
            background: '#ecfdf5',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 6,
            color: '#047857',
            fontWeight: 800,
            textAlign: 'center',
            padding: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>💻</span>
          <span>Kamera Laptop</span>
        </button>
      </div>

      {previews.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginTop: 14,
          }}
        >
          {previews.map((src, index) => (
            <div
              key={src}
              style={{
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <img
                src={src}
                alt={`Preview ${index + 1}`}
                style={{
                  width: '100%',
                  height: 180,
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              <button
                type="button"
                onClick={() => removeFile(index)}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 900,
                }}
              >
                ×
              </button>

              <div
                style={{
                  padding: 10,
                  fontSize: 12,
                  color: '#475569',
                  fontWeight: 600,
                  wordBreak: 'break-word',
                }}
              >
                {files[index]?.name || `Foto ${index + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {cameraOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              width: 'min(720px, 96vw)',
              background: '#ffffff',
              borderRadius: 18,
              padding: 18,
              boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
            }}
          >
            <h3
              style={{
                margin: '0 0 12px',
                color: '#0f172a',
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              Ambil Foto Langsung
            </h3>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: 'min(420px, 60vh)',
                objectFit: 'cover',
                background: '#020617',
                borderRadius: 14,
              }}
            />

            <canvas ref={canvasRef} hidden />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginTop: 14,
              }}
            >
              <button
                type="button"
                onClick={takePhoto}
                style={{
                  border: 'none',
                  borderRadius: 12,
                  padding: 14,
                  background: '#2f6fff',
                  color: 'white',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Ambil Foto
              </button>

              <button
                type="button"
                onClick={closeCamera}
                style={{
                  border: 'none',
                  borderRadius: 12,
                  padding: 14,
                  background: '#ef4444',
                  color: 'white',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}