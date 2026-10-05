// @ts-ignore
import script from "./scripts/postplate.inline"
import style from "./styles/postplate.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { joinSegments, pathToRoot } from "../util/path"

const plates = [
  { file: "hermes.webp", alt: "Many-armed Hermes pulling bundles of light" },
  { file: "bust.webp", alt: "Bust of Hermes among floating windows" },
  { file: "knight.webp", alt: "Portrait of a knight in armour" },
  { file: "ascent.webp", alt: "Figure ascending a stair toward a sun" },
  { file: "memory.webp", alt: "Classical head with blank eyes" },
  { file: "connect.webp", alt: "Face connected to a sphere by beams" },
  { file: "flight.webp", alt: "Winged figure in clouds" },
]

const PostPlate: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
  const base = joinSegments(pathToRoot(fileData.slug!), "assets/plates")
  const data = plates.map((p) => ({ src: joinSegments(base, p.file), alt: p.alt }))
  // the client script swaps in a random plate on every navigation
  return (
    <figure class={classNames(displayClass, "post-plate")} data-plates={JSON.stringify(data)}>
      <img src={data[0].src} alt={data[0].alt} />
    </figure>
  )
}

PostPlate.css = style
PostPlate.afterDOMLoaded = script

export default (() => PostPlate) satisfies QuartzComponentConstructor
