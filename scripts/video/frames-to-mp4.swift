// Encode a PNG sequence into an H.264 MP4 using AVFoundation.
//
// Playwright bundles an ffmpeg built with --disable-everything: VP8 into WebM
// and nothing else. LinkedIn wants MP4, and macOS AVFoundation cannot decode
// VP8, so the obvious webm -> mp4 hop is a dead end in both directions.
//
// Encoding the frames directly sidesteps it. Every frame is rendered by
// Playwright and handed here in order, so this needs no decoder at all — and
// the whole pipeline stays on tools already installed: no ffmpeg, no service,
// no account, no cost.
//
// Usage: frames-to-mp4 <frameDir> <out.mp4> <fps> <width> <height>

import AVFoundation
import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count == 6,
      let fps = Int32(args[3]),
      let width = Int(args[4]),
      let height = Int(args[5]) else {
    FileHandle.standardError.write("usage: frames-to-mp4 <frameDir> <out.mp4> <fps> <w> <h>\n".data(using: .utf8)!)
    exit(2)
}

let frameDir = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: outURL)

let frames = try FileManager.default
    .contentsOfDirectory(at: frameDir, includingPropertiesForKeys: nil)
    .filter { ["png", "jpg", "jpeg"].contains($0.pathExtension.lowercased()) }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }

guard !frames.isEmpty else {
    FileHandle.standardError.write("no frames in \(frameDir.path)\n".data(using: .utf8)!)
    exit(1)
}

let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        // ~12 Mbps at 1080p: LinkedIn re-encodes on upload, so the job here is
        // to hand it something clean enough that its own pass has nothing to
        // throw away. Text and thin UI lines are what suffer first.
        AVVideoAverageBitRateKey: 12_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: fps,
    ],
]

let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false

let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: input,
    sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
    ]
)

writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let colorSpace = CGColorSpaceCreateDeviceRGB()

func pixelBuffer(from url: URL) -> CVPixelBuffer? {
    guard let img = NSImage(contentsOf: url),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }

    var pb: CVPixelBuffer?
    let attrs: [String: Any] = [
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
    ]
    CVPixelBufferCreate(kCFAllocatorDefault, width, height,
                        kCVPixelFormatType_32ARGB, attrs as CFDictionary, &pb)
    guard let buf = pb else { return nil }

    CVPixelBufferLockBaseAddress(buf, [])
    defer { CVPixelBufferUnlockBaseAddress(buf, []) }

    guard let ctx = CGContext(
        data: CVPixelBufferGetBaseAddress(buf),
        width: width, height: height, bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buf),
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
    ) else { return nil }

    ctx.clear(CGRect(x: 0, y: 0, width: width, height: height))
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
    return buf
}

var frameIndex: Int64 = 0
let queue = DispatchQueue(label: "encode")
let done = DispatchSemaphore(value: 0)

input.requestMediaDataWhenReady(on: queue) {
    while input.isReadyForMoreMediaData {
        if frameIndex >= Int64(frames.count) {
            input.markAsFinished()
            writer.finishWriting { done.signal() }
            return
        }
        let url = frames[Int(frameIndex)]
        guard let buf = pixelBuffer(from: url) else {
            FileHandle.standardError.write("could not read \(url.lastPathComponent)\n".data(using: .utf8)!)
            frameIndex += 1
            continue
        }
        adaptor.append(buf, withPresentationTime: CMTime(value: frameIndex, timescale: fps))
        frameIndex += 1
    }
}

done.wait()

if writer.status == .completed {
    print("wrote \(outURL.path) — \(frames.count) frames @ \(fps)fps, \(width)x\(height)")
} else {
    FileHandle.standardError.write("encode failed: \(writer.error?.localizedDescription ?? "unknown")\n".data(using: .utf8)!)
    exit(1)
}
