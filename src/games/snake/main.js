import { mount } from "svelte";
import SnakeApp from "./SnakeApp.svelte";

// Svelteの画面をページのアプリ領域に取り付け、表示と入力を一つの部品にまとめます。
mount(SnakeApp, { target: document.querySelector("#app") });
