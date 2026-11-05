import { useState, useCallback } from 'react';
import { getSavedContacts, saveContact } from '../utils/calendarIntegration';

/**
 * Contatos recentes (e-mails já usados em atribuições), guardados no
 * localStorage. `rememberContact` ignora textos sem '@'.
 */
export const useSavedContacts = () => {
  const [savedContacts, setSavedContacts] = useState<string[]>(() => getSavedContacts());

  const rememberContact = useCallback((email: string) => {
    if (email && email.includes('@')) {
      saveContact(email);
      setSavedContacts(getSavedContacts());
    }
  }, []);

  return { savedContacts, rememberContact };
};
