import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  desktopShortcut,
  launchDesktop,
  makeUserDataDir,
  makeWorkspace,
  reloadDesktopRenderer,
  waitForWorkspaceByPath,
} from "../helpers/electron-app";

const SHOT_DIR = "/tmp/i18n-verify";

test("switching to Simplified Chinese applies immediately and survives relaunch", async () => {
  const userDataDir = await makeUserDataDir();
  const workspacePath = await makeWorkspace("i18n-language");
  let harness = await launchDesktop(userDataDir, {
    initialWorkspaces: [workspacePath],
    testMode: "background",
  });

  try {
    const window = await harness.firstWindow();
    await waitForWorkspaceByPath(window, workspacePath);
    await mkdir(SHOT_DIR, { recursive: true });
    await window.screenshot({ path: join(SHOT_DIR, "1-initial-main.png") });

    await window.keyboard.press(desktopShortcut(","));
    await expect(window.getByTestId("settings-surface")).toBeVisible();
    await openAppearanceSection(window);

    // Select by value: the option labels are native names, and the initial
    // language depends on the machine running the test.
    await languageSelect(window).selectOption("zh-CN");

    // The settings page translates in place, and <html lang> follows.
    await expect(window.getByRole("button", { name: "外观", exact: true })).toBeVisible();
    await expect(languageSelect(window)).toHaveValue("zh-CN");
    await expect.poll(() => window.evaluate(() => document.documentElement.lang)).toBe("zh-CN");
    await window.screenshot({ path: join(SHOT_DIR, "2-zh-settings.png") });

    // The choice outlives a renderer reload within the same launch.
    await reloadDesktopRenderer(window);
    await window.keyboard.press(desktopShortcut(","));
    await expect(window.getByTestId("settings-surface")).toBeVisible();
    await expect(window.getByRole("button", { name: "外观", exact: true })).toBeVisible();
  } finally {
    await harness.close();
  }

  // Relaunch: the language comes back from localStorage.
  harness = await launchDesktop(userDataDir, {
    initialWorkspaces: [workspacePath],
    testMode: "background",
  });

  try {
    const window = await harness.firstWindow();
    await waitForWorkspaceByPath(window, workspacePath);
    // The app restores the last view; the settings nav is still Chinese.
    await expect(window.getByRole("button", { name: "外观", exact: true })).toBeVisible();
    await window.getByRole("button", { name: "返回应用", exact: true }).click();
    await expect(window.locator(".sidebar__new")).toContainText("新建会话");
    await window.screenshot({ path: join(SHOT_DIR, "3-zh-relaunch.png") });

    // The command palette opens over the translated shell.
    await window.keyboard.press(desktopShortcut("K"));
    await expect(window.getByTestId("command-palette-input")).toBeVisible();
    await window.screenshot({ path: join(SHOT_DIR, "4-zh-palette.png") });
    await window.keyboard.press("Escape");

    // Switching back to English applies the same way.
    await window.keyboard.press(desktopShortcut(","));
    await expect(window.getByTestId("settings-surface")).toBeVisible();
    await openAppearanceSection(window);
    await languageSelect(window).selectOption("en-US");
    await expect(window.getByRole("button", { name: "Appearance", exact: true })).toBeVisible();
    await expect.poll(() => window.evaluate(() => document.documentElement.lang)).toBe("en-US");
    await window.screenshot({ path: join(SHOT_DIR, "5-back-to-en.png") });
  } finally {
    await harness.close();
  }
});

/** The settings nav labels follow the active language, so find Appearance by either. */
async function openAppearanceSection(window: Page): Promise<void> {
  const appearance = window.getByRole("button", { name: /外观|Appearance/, exact: true });
  await appearance.click();
}

function languageSelect(window: Page) {
  return window.getByLabel(/语言|Language/);
}
