// src/utils/extractNationalityPrefs.ts

export function extractNationalityPrefs(nationalityValue?: string, remarksValue?: string): string[] {
    let str = "";
    if (nationalityValue) str += String(nationalityValue) + " ";
    if (remarksValue) str += String(remarksValue);
    str = str.toLowerCase();

    if (str.includes("any") || str.includes("all nationality")) {
        return ["Indonesia", "Myanmar", "Philippines"];
    }
    if (str.includes("myanmar/indonesian") || str.includes("indonesian/myanmar"))
        return ["Myanmar", "Indonesia"];
    if (
        str.includes("myanmar only") ||
        str.includes("myammar only") ||
        str.includes("myr only") ||
        str.includes("mym only")
    )
        return ["Myanmar"];
    if (
        str.includes("indonesian only") ||
        str.includes("indo only") ||
        str.includes("indon only")
    )
        return ["Indonesia"];
    if (
        str.includes("filipino only") ||
        str.includes("pinoy only") ||
        str.includes("philipine only") ||
        str.includes("phillipines only")
    )
        return ["Philippines"];

    const result: string[] = [];
    if (
        str.includes("indonesian") ||
        str.includes("indo") ||
        str.includes("indon")
    )
        result.push("Indonesia");
    if (
        str.includes("myanmar") ||
        str.includes("myammar") ||
        str.includes("myr") ||
        str.includes("mym")
    )
        result.push("Myanmar");
    if (
        str.includes("filipino") ||
        str.includes("pinoy") ||
        str.includes("philip") ||
        str.includes("phillipine")
    )
        result.push("Philippines");

    return Array.from(new Set(result));
}
