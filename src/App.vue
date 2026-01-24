<script setup>
import { watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from './components/Navbar.vue';
import AuthForm from './components/AuthForm.vue';
import { useAuth } from './composables/useAuth';
// Import version from package.json via Vite define
const { user, userProfile } = useAuth();
const router = useRouter();
// Vite exposes env variables, so we need to define the version in vite.config.js
const version = import.meta.env.VITE_APP_VERSION;

// Redirect to approval page if user is logged in but not approved
watchEffect(() => {
  // Show approval-required if approved is false, null, or missing
  if (user.value && userProfile.value && (userProfile.value.approved === false || userProfile.value.approved === undefined || userProfile.value.approved === null)) {
    if (router.currentRoute.value.path !== '/approval-required') {
      router.replace('/approval-required');
    }
  } else if (!user.value && router.currentRoute.value.path === '/approval-required') {
    router.replace('/');
  }
});
</script>


<template>
  <div class="app-flex-root">
    <div class="fixed-header">
      <header v-if="user && userProfile && userProfile.approved">
        <img src="/lanlink-logo.png" alt="LANLink Logo" class="main-logo" />
      </header>
      <Navbar v-if="user && userProfile && userProfile.approved" />
    </div>
    <main v-if="user && userProfile && userProfile.approved" class="main-content">
      <router-view />
    </main>
    <AuthForm v-else-if="!user" />
    <router-view v-else-if="user && userProfile && (userProfile.approved === false || userProfile.approved === undefined || userProfile.approved === null) && $route.path === '/approval-required'" />
    <footer v-if="user && userProfile && userProfile.approved" class="footer-legal">
      <span>
        LANLink v{{ version }}<br>
        Made with ❤️ using Vue 3, Vite, and Firebase<br>
        Crafted with the help of GitHub Copilot, GPT-4.1, thoughtfully tuned prompts, and a dash of software engineering expertise.
      </span>
      <br />
      <router-link to="/impressum" class="footer-link">Impressum</router-link>
      &nbsp;|&nbsp;
      <router-link to="/privacy" class="footer-link">Datenschutzerklärung / Privacy Policy</router-link>
      &nbsp;|&nbsp;
        <a href="https://github.com/Kai-Herzig/LANLink" class="footer-link github-link" target="_blank" rel="noopener">LANLink@GitHub</a>
    </footer>
  </div>
</template>

<style scoped>
.footer-legal {
  margin-top: 2em;
  text-align: center;
  font-size: 1em;
  color: #a5b4fc;
}
.footer-link {
  color: #2563eb;
  margin: 0 0.5em;
  text-decoration: underline;
  cursor: pointer;
}
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  background: #1e293b;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 8px 0 #0002;
}
.main-logo {
  max-height: 165px;
  max-width: 100%;
  margin: 0 auto 0.7em auto;
  display: block;
}
.main-content {
  margin-top: calc(165px + 56px + 32px); /* logo height + navbar height + small extra spacing */
  padding: 0 1em 2em 1em;
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
  height: calc(100vh - (165px + 56px + 32px));
  overflow-y: auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-flex-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.main-content {
  flex: 1 0 auto;
}
</style>


