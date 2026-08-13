import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Historique d'actions pour annuler/rétablir les modifications de l'organigramme.
// Types gérés : hierarchy (changement de rattachement), edit (modification de fiche), photo (upload photo).
export function useOrgHistory(setEmployees, toast) {
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const pushAction = useCallback((action) => {
    setPast(p => [...p, action]);
    setFuture([]);
  }, []);

  const applyAction = useCallback(async (action, isUndo) => {
    try {
      if (action.type === 'hierarchy') {
        const managerId = isUndo ? action.oldManagerId : action.newManagerId;
        await base44.entities.Employee.update(action.employeeId, { manager_id: managerId });
        setEmployees(prev => prev.map(e => e.id === action.employeeId ? { ...e, manager_id: managerId } : e));
      } else if (action.type === 'edit') {
        const fields = isUndo ? action.oldFields : action.newFields;
        await base44.entities.Employee.update(action.employeeId, fields);
        setEmployees(prev => prev.map(e => e.id === action.employeeId ? { ...e, ...fields } : e));
      } else if (action.type === 'photo') {
        const photoUrl = isUndo ? action.oldPhotoUrl : action.newPhotoUrl;
        await base44.entities.Employee.update(action.employeeId, { photo_url: photoUrl });
        setEmployees(prev => prev.map(e => e.id === action.employeeId ? { ...e, photo_url: photoUrl } : e));
      }
      return true;
    } catch {
      return false;
    }
  }, [setEmployees]);

  const undo = useCallback(async () => {
    if (past.length === 0) return;
    const action = past[past.length - 1];
    const ok = await applyAction(action, true);
    if (ok) {
      setPast(p => p.slice(0, -1));
      setFuture(f => [...f, action]);
      toast({ title: 'Action annulée', duration: 2000 });
    } else {
      toast({ title: 'Annulation impossible', variant: 'destructive', duration: 3000 });
    }
  }, [past, applyAction, toast]);

  const redo = useCallback(async () => {
    if (future.length === 0) return;
    const action = future[future.length - 1];
    const ok = await applyAction(action, false);
    if (ok) {
      setFuture(f => f.slice(0, -1));
      setPast(p => [...p, action]);
      toast({ title: 'Action rétablie', duration: 2000 });
    } else {
      toast({ title: 'Rétablissement impossible', variant: 'destructive', duration: 3000 });
    }
  }, [future, applyAction, toast]);

  return { pushAction, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}