// Render chosen PDF pages to PNG at a given scale.
//
// Playwright's toolchain cannot page a PDF and `sips` only ever hands back
// page one, which is why the film could previously only show a cover. PDFKit
// is already on the machine, so this is the whole dependency.
//
// Build: swiftc -O scripts/video/pdf-pages.swift -o scripts/video/pdf-pages
// Usage: pdf-pages <in.pdf> <outDir> <scale> <page> [page ...]   (1-indexed)

import Foundation
import PDFKit
import AppKit

let args = CommandLine.arguments
guard args.count >= 5 else {
    FileHandle.standardError.write("usage: pdf-pages <in.pdf> <outDir> <scale> <page>...\n".data(using: .utf8)!)
    exit(2)
}
let src = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
let scale = CGFloat(Double(args[3]) ?? 2.0)
let pages = args[4...].compactMap { Int($0) }

guard let doc = PDFDocument(url: src) else {
    FileHandle.standardError.write("cannot open \(src.path)\n".data(using: .utf8)!)
    exit(1)
}
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

for n in pages {
    guard n >= 1, n <= doc.pageCount, let page = doc.page(at: n - 1) else {
        FileHandle.standardError.write("page \(n) out of range (1...\(doc.pageCount))\n".data(using: .utf8)!)
        exit(1)
    }
    let box = page.bounds(for: .mediaBox)
    let w = Int(box.width * scale), h = Int(box.height * scale)

    guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8,
                              bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
        FileHandle.standardError.write("cannot allocate \(w)x\(h)\n".data(using: .utf8)!)
        exit(1)
    }
    // White under the page: a PDF page has no background of its own, and an
    // unfilled context leaves transparent gaps wherever the design does not paint.
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    ctx.scaleBy(x: scale, y: scale)
    ctx.translateBy(x: -box.origin.x, y: -box.origin.y)
    page.draw(with: .mediaBox, to: ctx)

    guard let img = ctx.makeImage() else { exit(1) }
    let rep = NSBitmapImageRep(cgImage: img)
    guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
    let dst = outDir.appendingPathComponent(String(format: "p%02d.png", n))
    try png.write(to: dst)
    print("\(dst.path)  \(w)x\(h)")
}
