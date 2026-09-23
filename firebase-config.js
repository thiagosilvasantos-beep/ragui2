/* ─── Firebase Config ─── */
(function() {
  'use strict';

  // Firebase CDN já carregado via script tags no HTML
  var app = firebase.initializeApp({
    apiKey: "AIzaSyAjHE07Hhq5IZs7-mGRHRuj9tuep7i9QyA",
    authDomain: "ragui-84c9e.firebaseapp.com",
    projectId: "ragui-84c9e",
    storageBucket: "ragui-84c9e.firebasestorage.app",
    messagingSenderId: "1094634533239",
    appId: "1:1094634533239:web:85ebe458f3fdccaf96f172"
  });

  window.RAGUI_DB = firebase.firestore();
  window.RAGUI_STORAGE = firebase.storage();
  window.RAGUI_COLLECTION = 'filmes';
})();
