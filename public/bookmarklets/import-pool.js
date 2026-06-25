(async () => {
  const apiBase =
    window.localStorage.getItem("brackeroni_api_base") ||
    `${window.location.protocol}//localhost:3000`;

  const selection = window.getSelection?.()?.toString()?.trim() || "";
  const preferredRoot =
    document.querySelector("main") ||
    document.querySelector("article") ||
    document.querySelector('[role="main"]') ||
    document.body;
  const html = preferredRoot?.outerHTML || document.body?.outerHTML || "";
  const defaultName = document.title?.trim()
    ? document.title.trim().slice(0, 120)
    : "Imported Pool";
  const poolName = window.prompt("Pool name", defaultName);

  if (!poolName) {
    return;
  }

  const payload = {
    name: poolName,
    description: `Imported from ${window.location.hostname}`,
    source: {
      type: "extract",
      prompt: [
        `Extract candidates for "${poolName}".`,
        "Be exhaustive rather than selective.",
        "Return distinct candidate entities explicitly supported by the page.",
        "Use short descriptions derived from the page content, not meta commentary about extraction.",
        "Ignore navigation, ads, boilerplate, account controls, and unrelated page chrome."
      ].join(" "),
      pageTitle: document.title || null,
      pageUrl: window.location.href,
      ...(selection ? { text: selection } : { html })
    }
  };

  try {
    const response = await fetch(`${apiBase}/api/pools`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "Import failed.");
    }

    window.alert(
      `Imported pool "${data.item?.name || poolName}" with ${data.item?.candidateCount ?? "?"} candidates.`
    );
  } catch (error) {
    window.alert(error.message || "Import failed.");
  }
})();
