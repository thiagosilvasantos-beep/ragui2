# 🔒 Correção Definitiva de Segurança: Firebase Auth + Regras do Firestore

Este documento descreve as etapas para proteger os dados confidenciais do RAGUI (Leads de alunos, métricas do Monitor e painel administrativo).

---

## 📌 O que já foi preparado no código (Pronto no repositório):

1. **`admin/index.html`**:
   - Integrado o SDK oficial do **Firebase Authentication** (`firebase-auth-compat.js`).
   - Formulário de login atualizado para receber **E-mail** e **Senha**.
   - Adicionado botão de **Sair (Logout)** na barra de navegação.

2. **`firebase-config.js`**:
   - Inicializado e exposto `window.RAGUI_AUTH = firebase.auth()`.

3. **`admin/admin.js`**:
   - Removida completamente a senha fixa hardcoded (`329874`) e o `sessionStorage`.
   - Adicionada autenticação oficial com `auth.signInWithEmailAndPassword(email, pass)`.
   - O painel só descriptografa e busca os dados do Monitor e dos Filmes se o usuário estiver autenticado com token válido do Firebase.

4. **`firestore.rules`**:
   - Arquivo criado na raiz com as regras completas e seguras.

---

## 🚀 O que você precisa fazer agora (5 minutos):

### Passo 1: Habilitar Autenticação e Criar seu Usuário no Firebase Console
1. Acesse o **Firebase Console**: [https://console.firebase.google.com/project/ragui-84c9e/authentication](https://console.firebase.google.com/project/ragui-84c9e/authentication)
2. Clique na aba **"Sign-in method"** (Método de login).
3. Clique em **"E-mail/senha"** e marque a opção **Ativar** (não precisa marcar link de e-mail sem senha). Clique em **Salvar**.
4. Agora clique na aba **"Users"** (Usuários) no topo.
5. Clique em **"Adicionar usuário"**.
6. Digite o seu e-mail de administrador e escolha uma senha forte.
7. Clique em **Adicionar usuário**.

---

### Passo 2: Publicar as Regras de Segurança no Firestore
1. Acesse a aba de regras do Firestore: [https://console.firebase.google.com/project/ragui-84c9e/firestore/rules](https://console.firebase.google.com/project/ragui-84c9e/firestore/rules)
2. Apague o texto que estiver lá e cole exatamente o conteúdo abaixo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 1. Filmes: leitura pública para o catálogo carregar
    match /filmes/{filmeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // 2. Leads: visitantes só criam cadastro; só admin logado lê
    match /leads/{leadId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    // 3. Cliques e Métricas: criação pública para tracking; só admin logado lê
    match /clicks/{clickId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    // 4. Pageviews: criação pública; só admin logado lê
    match /pageviews/{pageviewId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    // 5. Visitas (Beacon): criação pública; só admin logado lê
    match /visitas/{visitaId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    // Bloqueia qualquer outra rota não autorizada
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
3. Clique no botão azul **"Publicar"** no canto superior direito.

---

### Passo 3: Testar o Acesso
1. Abra uma aba anônima e acesse: [https://ragui.com.br/admin](https://ragui.com.br/admin)
2. Faça o login com o e-mail e senha que você acabou de criar no Firebase Console.
3. Você verá o painel administrativo e o Monitor carregando com sucesso!
4. Abra o console do navegador (`F12` ou `Cmd+Option+I`) e digite:
   ```javascript
   firebase.auth().signOut()
   ```
5. Você será desconectado imediatamente para a tela de login. Tentar consultar os dados sem estar logado retornará erro de permissão negada (`Missing or insufficient permissions`).
