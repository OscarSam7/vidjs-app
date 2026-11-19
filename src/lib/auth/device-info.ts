export function parseUserAgent(uaString: string | null): string {
  if (!uaString) return "Navegador Web";

  let browser = "Navegador Web";
  if (uaString.includes("Firefox/")) browser = "Firefox";
  else if (uaString.includes("Edg/")) browser = "Microsoft Edge";
  else if (uaString.includes("Chrome/")) browser = "Google Chrome";
  else if (uaString.includes("Safari/") && !uaString.includes("Chrome/")) browser = "Safari";
  else if (uaString.includes("Opera") || uaString.includes("OPR/")) browser = "Opera";

  let os = "PC";
  if (uaString.includes("Windows NT 10.0") || uaString.includes("Windows NT 11.0")) os = "Windows PC";
  else if (uaString.includes("Windows")) os = "Windows";
  else if (uaString.includes("Macintosh") || uaString.includes("Mac OS X")) os = "Apple Mac";
  else if (uaString.includes("Linux")) os = "Linux";
  else if (uaString.includes("iPhone")) os = "iPhone";
  else if (uaString.includes("iPad")) os = "iPad";
  else if (uaString.includes("Android")) os = "Android";

  return `${browser} en ${os}`;
}
