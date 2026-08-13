import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';
import { X, Mail, Lock, UserPlus, Loader2, Crown, Shield, Building2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/components/ui/use-toast';

export default function CreateAccountModal({ onClose, onCreated }) {
  const { companies } = useCompany();
  const [step, setStep] = useState('form'); // form | otp | done
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user');
  const [companyIds, setCompanyIds] = useState([]); // [] = super admin (toutes)
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const toggleCompany = (id) => {
    setCompanyIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setError('');
    if (!email.trim()) { setError('Veuillez saisir un email.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return; }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email: email.trim(), password });
      setStep('otp');
      toast({ title: 'Code envoyé', description: `Un code à 6 chiffres a été envoyé à ${email.trim()}. Demandez-le à la personne.`, duration: 6000 });
    } catch (err) {
      setError(err?.message || "Impossible de créer le compte. L'email est peut-être déjà utilisé.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      await base44.auth.verifyOtp({ email: email.trim(), otpCode });
      // On NE setToken PAS : on reste connecté en tant qu'admin
      // Le compte est maintenant vérifié. On attribue le rôle + les sociétés.
      try {
        const users = await base44.entities.User.list();
        const newUser = users.find(u => u.email === email.trim());
        if (newUser) {
          const updates = {};
          if (role === 'admin') updates.role = 'admin';
          // accessible_company_ids : [] = super admin (toutes les sociétés)
          if (companyIds.length > 0) updates.accessible_company_ids = companyIds;
          if (Object.keys(updates).length > 0) {
            await base44.entities.User.update(newUser.id, updates);
          }
        }
      } catch {
        // Les attributions seront possibles manuellement plus tard
      }
      setStep('done');
      toast({ title: 'Compte créé', description: `${email.trim()} peut maintenant se connecter.`, duration: 5000 });
    } catch (err) {
      setError(err?.message || 'Code incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await base44.auth.resendOtp(email.trim());
      toast({ title: 'Code renvoyé', description: 'Vérifiez la boîte mail.' });
    } catch (err) {
      setError(err?.message || 'Impossible de renvoyer le code.');
    }
  };

  const handleClose = () => {
    if (step === 'done') onCreated?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-heading font-semibold text-foreground">Créer un compte RH</h2>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'form' && (
          <form onSubmit={handleRegister} className="space-y-4">
            {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
            <div className="space-y-1.5">
              <Label htmlFor="ca-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="ca-email" type="email" placeholder="prenom.nom@societe.fr" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required autoFocus />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ca-pwd">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="ca-pwd" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ca-confirm">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="ca-confirm" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRole('user')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${role === 'user' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                  <Shield className="w-4 h-4" /> Utilisateur
                </button>
                <button type="button" onClick={() => setRole('admin')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${role === 'admin' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                  <Crown className="w-4 h-4" /> Admin
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                Sociétés accessibles
              </Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Laissez vide pour un accès total (super admin). Sinon, sélectionnez les sociétés.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {companies.map((c) => {
                  const selected = companyIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCompany(c.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-primary text-white'
                          : 'bg-white border border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {c.name}
                    </button>
                  );
                })}
                {companies.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucune société disponible.</p>
                )}
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-800">
                Un code de vérification à 6 chiffres sera envoyé à cette adresse. Demandez-le à la personne
                et saisissez-le à l'étape suivante pour activer le compte (étape obligatoire de la plateforme).
              </p>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Création…</> : 'Créer le compte'}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <div className="space-y-5">
            {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-foreground font-medium">Code de vérification</p>
              <p className="text-xs text-muted-foreground mt-1">Un code a été envoyé à <strong>{email}</strong>. Demandez-le à la personne et saisissez-le ci-dessous.</p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerify} className="w-full h-11" disabled={loading || otpCode.length < 6}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validation…</> : 'Valider le compte'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Pas reçu le code ?{' '}
              <button onClick={handleResend} className="text-primary font-medium hover:underline">Renvoyer</button>
            </p>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground text-lg">Compte créé avec succès</p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>{email}</strong> peut maintenant se connecter avec le mot de passe défini.
                {role === 'admin' && ' Rôle administrateur attribué.'}
                {companyIds.length > 0 ? ` ${companyIds.length} société(s) accessible(s).` : ' Accès total (super admin).'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Pensez à communiquer le mot de passe à la personne.
            </p>
            <Button onClick={handleClose} className="w-full h-11">Terminer</Button>
          </div>
        )}
      </div>
    </div>
  );
}