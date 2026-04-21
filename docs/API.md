# API Documentation - Despesas-Odoo

## Visão Geral

Este documento descreve a integração com Firebase, estrutura de dados, queries utilizadas e regras de segurança.

## Firebase Configuration

### Configuração Inicial

**Arquivo:** `src/config/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Variáveis de Ambiente

**Arquivo:** `.env`

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Firestore Database

### Coleções

#### expenses

**Descrição:** Coleção de despesas do usuário.

**Estrutura do documento:**

```typescript
interface ExpenseDocument {
  id: string;                    // ID do documento (gerado automaticamente)
  description: string;           // Descrição da despesa
  amount: number;                // Valor da despesa
  category: string;              // Categoria da despesa
  store: string;                 // Loja da despesa
  date: string;                  // Data no formato ISO (YYYY-MM-DD)
  createdAt: string;             // Data de criação no formato ISO
  userId: string;                // ID do usuário (autenticação anônima)
}
```

**Exemplo de documento:**

```json
{
  "id": "abc123",
  "description": "Aluguel Loja Premium",
  "amount": 1500.00,
  "category": "Aluguel",
  "store": "Piracicaba (DP - Realme - XV)",
  "date": "2024-01-15",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "userId": "anonymous_user_123"
}
```

**Índices recomendados:**

```javascript
// Índice composto para queries por data e usuário
{
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "DESCENDING" }
  ],
  "queryScope": "COLLECTION"
}
```

#### checklists

**Descrição:** Coleção de checklists globais.

**Estrutura do documento:**

```typescript
interface ChecklistDocument {
  id: string;                    // ID do documento
  items: ChecklistItem[];        // Lista de itens do checklist
  updatedAt: string;             // Data da última atualização
}
```

**Exemplo de documento:**

```json
{
  "id": "global_checklist_v1",
  "items": [
    {
      "id": "item_1",
      "text": "Verificar pagamentos do dia",
      "completed": false
    }
  ],
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Queries Utilizadas

### 1. Listar Todas as Despesas

**Hook:** `useExpenses`

**Query:**

```typescript
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const q = query(
  collection(db, 'expenses'),
  orderBy('date', 'desc')
);

const unsubscribe = onSnapshot(q, (snapshot) => {
  const expenses = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  // Processar dados
});
```

**Retorno:** Lista de despesas ordenadas por data (mais recente primeiro)

---

### 2. Adicionar Despesa

**Hook:** `useExpenses.addExpense`

**Query:**

```typescript
import { collection, addDoc } from 'firebase/firestore';

const expense = {
  description: 'Aluguel',
  amount: 1500,
  category: 'Aluguel',
  store: 'Piracicaba (DP - Realme - XV)',
  date: '2024-01-15',
  userId: user.uid
};

const docRef = await addDoc(collection(db, 'expenses'), {
  ...expense,
  createdAt: new Date().toISOString()
});

console.log('Despesa adicionada com ID:', docRef.id);
```

**Retorno:** ID do documento criado

---

### 3. Atualizar Despesa

**Hook:** `useExpenses.updateExpense`

**Query:**

```typescript
import { doc, updateDoc } from 'firebase/firestore';

const expenseRef = doc(db, 'expenses', expenseId);

await updateDoc(expenseRef, {
  amount: 1600,
  description: 'Aluguel Loja Premium'
});
```

**Retorno:** Promise<void>

---

### 4. Excluir Despesa

**Hook:** `useExpenses.deleteExpense`

**Query:**

```typescript
import { doc, deleteDoc } from 'firebase/firestore';

await deleteDoc(doc(db, 'expenses', expenseId));
```

**Retorno:** Promise<void>

**Validação:** Só é possível excluir nas primeiras 24h após criação

---

### 5. Filtrar Despesas por Loja

**Hook:** `useExpenses.getExpenses`

**Query:**

```typescript
import { collection, query, where, orderBy } from 'firebase/firestore';

const q = query(
  collection(db, 'expenses'),
  where('store', '==', 'Piracicaba (DP - Realme - XV)'),
  orderBy('date', 'desc')
);

const snapshot = await getDocs(q);
const expenses = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

**Retorno:** Lista de despesas filtradas

---

### 6. Filtrar Despesas por Categoria

**Hook:** `useExpenses.getExpenses`

**Query:**

```typescript
import { collection, query, where, orderBy } from 'firebase/firestore';

const q = query(
  collection(db, 'expenses'),
  where('category', '==', 'Aluguel'),
  orderBy('date', 'desc')
);

const snapshot = await getDocs(q);
const expenses = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

**Retorno:** Lista de despesas filtradas

---

### 7. Filtrar Despesas por Período

**Hook:** `useExpenses.getExpenses`

**Query:**

```typescript
import { collection, query, where, orderBy } from 'firebase/firestore';

const q = query(
  collection(db, 'expenses'),
  where('date', '>=', '2024-01-01'),
  where('date', '<=', '2024-01-31'),
  orderBy('date', 'desc')
);

const snapshot = await getDocs(q);
const expenses = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

**Retorno:** Lista de despesas do período

---

### 8. Obter Checklist Global

**Query:**

```typescript
import { doc, getDoc } from 'firebase/firestore';

const docRef = doc(db, 'checklists', 'global_checklist_v1');
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  const checklist = docSnap.data();
  console.log('Checklist:', checklist);
} else {
  console.log('Checklist não encontrado');
}
```

**Retorno:** Documento do checklist ou null

---

### 9. Atualizar Checklist

**Query:**

```typescript
import { doc, updateDoc } from 'firebase/firestore';

const checklistRef = doc(db, 'checklists', 'global_checklist_v1');

await updateDoc(checklistRef, {
  items: updatedItems,
  updatedAt: new Date().toISOString()
});
```

**Retorno:** Promise<void>

## Firebase Authentication

### Autenticação Anônima

**Hook:** `useAuth`

**Login:**

```typescript
import { signInAnonymously } from 'firebase/auth';

try {
  const userCredential = await signInAnonymously(auth);
  const user = userCredential.user;
  console.log('Usuário logado:', user.uid);
} catch (error) {
  console.error('Erro no login:', error);
}
```

**Logout:**

```typescript
import { signOut } from 'firebase/auth';

try {
  await signOut(auth);
  console.log('Usuário deslogado');
} catch (error) {
  console.error('Erro no logout:', error);
}
```

**Monitorar estado de autenticação:**

```typescript
import { onAuthStateChanged } from 'firebase/auth';

const unsubscribe = onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('Usuário autenticado:', user.uid);
  } else {
    console.log('Usuário não autenticado');
  }
});

// Cleanup
unsubscribe();
```

## Regras de Segurança

### Regras Atuais (Firestore)

**Arquivo:** `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para expenses
    match /expenses/{expenseId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
    }
    
    // Regras para checklists
    match /checklists/{checklistId} {
      allow read: if true;
      allow write: if false; // Apenas admin
    }
  }
}
```

### Regras Recomendadas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isValidExpense() {
      return request.resource.data.keys().hasAll([
        'description', 'amount', 'category', 'store', 'date'
      ]) && request.resource.data.amount > 0;
    }
    
    // Regras para expenses
    match /expenses/{expenseId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() 
        && isValidExpense()
        && request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId);
      allow delete: if isOwner(resource.data.userId)
        && (resource.data.createdAt + 86400000) > request.time;
    }
    
    // Regras para checklists
    match /checklists/{checklistId} {
      allow read: if true;
      allow write: if false; // Apenas admin via Cloud Functions
    }
  }
}
```

## Cloud Functions (Futuro)

### Função: validateExpense

**Descrição:** Valida despesa antes de salvar

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const validateExpense = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário não autenticado'
    );
  }

  const { description, amount, category, store, date } = data;

  // Validações
  if (!description || description.trim().length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Descrição é obrigatória'
    );
  }

  if (amount <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Valor deve ser maior que zero'
    );
  }

  // Validar categoria
  const validCategories = [
    'Despesa Fixa', 'Despesa', 'Salário', 'Vale Alimentação',
    'Vale Transporte', 'Vale (Adiantamento)', 'Despesa Jack',
    'Impostos', 'Requisição'
  ];

  if (!validCategories.includes(category)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Categoria inválida'
    );
  }

  // Validar loja
  const validStores = [
    'Dom Pedro II', 'Realme', 'Xv de Novembro', 'Premium',
    'Kassouf', 'Piracicaba (DP - Realme - XV)',
    'Amparo (Premium - Kassouf)', 'Todas'
  ];

  if (!validStores.includes(store)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Loja inválida'
    );
  }

  // Validar data
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Data inválida'
    );
  }

  return { valid: true };
});
```

### Função: calculateAnalytics

**Descrição:** Calcula analytics no servidor

```typescript
export const calculateAnalytics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário não autenticado'
    );
  }

  const { startDate, endDate, store, category } = data;

  const db = admin.firestore();
  let query = db.collection('expenses')
    .where('userId', '==', context.auth.uid);

  if (startDate) {
    query = query.where('date', '>=', startDate);
  }

  if (endDate) {
    query = query.where('date', '<=', endDate);
  }

  if (store) {
    query = query.where('store', '==', store);
  }

  if (category) {
    query = query.where('category', '==', category);
  }

  const snapshot = await query.get();
  const expenses = snapshot.docs.map(doc => doc.data());

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const average = expenses.length > 0 ? total / expenses.length : 0;

  const byCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  const byStore = expenses.reduce((acc, exp) => {
    acc[exp.store] = (acc[exp.store] || 0) + exp.amount;
    return acc;
  }, {});

  return {
    total,
    average,
    count: expenses.length,
    byCategory,
    byStore
  };
});
```

## Erros Comuns

### 1. Erro de Permissão

**Erro:** `FirebaseError: Missing or insufficient permissions`

**Causa:** Usuário não tem permissão para acessar o documento

**Solução:** Verificar regras de segurança e autenticação

---

### 2. Erro de Índice

**Erro:** `FirebaseError: The query requires an index`

**Causa:** Query composta sem índice criado

**Solução:** Criar índice no console do Firebase

---

### 3. Erro de Validação

**Erro:** `FirebaseError: Invalid argument`

**Causa:** Dados inválidos sendo enviados

**Solução:** Validar dados antes de enviar

---

### 4. Erro de Rede

**Erro:** `FirebaseError: Failed to get document because the client is offline`

**Causa:** Sem conexão com a internet

**Solução:** Implementar cache offline e tratamento de erros

## Boas Práticas

### 1. Tratamento de Erros

Sempre tratar erros adequadamente:

```typescript
try {
  await addDoc(collection(db, 'expenses'), expense);
} catch (error) {
  console.error('Erro ao adicionar despesa:', error);
  throw error;
}
```

### 2. Validação no Frontend

Validar dados antes de enviar:

```typescript
const validateExpense = (expense: Partial<Expense>): boolean => {
  if (!expense.description || expense.description.trim().length === 0) {
    return false;
  }

  if (!expense.amount || expense.amount <= 0) {
    return false;
  }

  return true;
};
```

### 3. Otimização de Queries

Usar índices e limitar resultados:

```typescript
const q = query(
  collection(db, 'expenses'),
  where('userId', '==', user.uid),
  orderBy('date', 'desc'),
  limit(100)
);
```

### 4. Cache Offline

Habilitar cache offline:

```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.error('Múltiplas abas abertas');
  } else if (err.code === 'unimplemented') {
    console.error('Browser não suporta IndexedDB');
  }
});
```

### 5. Listener Cleanup

Sempre fazer cleanup de listeners:

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Processar dados
  });

  return () => unsubscribe();
}, []);
```

## Próximos Passos

1. Implementar Cloud Functions para validação
2. Adicionar regras de segurança mais robustas
3. Implementar cache offline
4. Adicionar auditoria de ações
5. Implementar autenticação real

## Referências

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
