document.addEventListener("nav", () => {
  for (const plate of document.querySelectorAll<HTMLElement>(".post-plate")) {
    const img = plate.querySelector("img")
    const plates: { src: string; alt: string }[] = JSON.parse(plate.dataset.plates ?? "[]")
    if (!img || plates.length === 0) continue

    const pick = plates[Math.floor(Math.random() * plates.length)]
    img.onload = () => plate.classList.add("ready")
    img.src = pick.src
    img.alt = pick.alt
    if (img.complete) plate.classList.add("ready")
  }
})
