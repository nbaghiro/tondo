import { z } from "zod";
import type { BlockDefinition } from "../define-block";
import { booking } from "./booking";
import { button } from "./button";
import { contact } from "./contact";
import { countdown } from "./countdown";
import { divider } from "./divider";
import { embed } from "./embed";
import { events } from "./events";
import { faq } from "./faq";
import { file } from "./file";
import { form } from "./form";
import { gallery } from "./gallery";
import { heading } from "./heading";
import { image } from "./image";
import { linkCard } from "./link-card";
import { location } from "./location";
import { logos } from "./logos";
import { music } from "./music";
import { posts } from "./posts";
import { products } from "./products";
import { quotes } from "./quotes";
import { ribbon } from "./ribbon";
import { services } from "./services";
import { signup } from "./signup";
import { stats } from "./stats";
import { team } from "./team";
import { text } from "./text";
import { timeline } from "./timeline";
import { tip } from "./tip";
import { video } from "./video";

// Adding a block: copy a block file, change it, then add it to both lists here.
export const leafSchemaUnion = z.discriminatedUnion("type", [
    heading.schema,
    text.schema,
    ribbon.schema,
    divider.schema,
    button.schema,
    linkCard.schema,
    contact.schema,
    image.schema,
    gallery.schema,
    video.schema,
    music.schema,
    posts.schema,
    file.schema,
    products.schema,
    services.schema,
    booking.schema,
    events.schema,
    countdown.schema,
    tip.schema,
    signup.schema,
    form.schema,
    quotes.schema,
    logos.schema,
    stats.schema,
    team.schema,
    faq.schema,
    timeline.schema,
    location.schema,
    embed.schema,
]);

export type LeafBlock = z.output<typeof leafSchemaUnion>;

export const leafDefinitions: Record<LeafBlock["type"], BlockDefinition> = {
    heading,
    text,
    ribbon,
    divider,
    button,
    "link-card": linkCard,
    contact,
    image,
    gallery,
    video,
    music,
    posts,
    file,
    products,
    services,
    booking,
    events,
    countdown,
    tip,
    signup,
    form,
    quotes,
    logos,
    stats,
    team,
    faq,
    timeline,
    location,
    embed,
};
