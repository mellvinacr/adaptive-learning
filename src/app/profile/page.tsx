'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        displayName: '',
        school: '',
        grade: '',
        phone: '',
        parentEmail: ''
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const docRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFormData({
                        displayName: data.displayName || currentUser.displayName || '',
                        school: data.school || '',
                        grade: data.grade || '',
                        phone: data.phone || '',
                        parentEmail: data.parentEmail || ''
                    });
                }
                setLoading(false);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (user) {
                await setDoc(doc(db, 'users', user.uid), {
                    ...formData,
                    lastProfileUpdate: new Date()
                }, { merge: true });
                alert('Biodata berhasil disimpan!');
                router.push('/dashboard');
            }
        } catch (error) {
            console.error(error);
            alert('Gagal menyimpan biodata.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Profile...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Biodata Siswa 🎓</h2>
                    <p className="text-gray-500">Lengkapi data diri kamu ya!</p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                        <input
                            type="text"
                            name="displayName"
                            value={formData.displayName}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Asal Sekolah</label>
                        <input
                            type="text"
                            name="school"
                            value={formData.school}
                            onChange={handleChange}
                            placeholder="Contoh: SMA Negeri 1 Jakarta"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Kelas</label>
                        <input
                            type="text"
                            name="grade"
                            value={formData.grade}
                            onChange={handleChange}
                            placeholder="Contoh: 10 IPA 1"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nomor HP / WhatsApp</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-blue-700">Email Orang Tua (Untuk Laporan)</label>
                        <input
                            type="email"
                            name="parentEmail"
                            value={formData.parentEmail}
                            onChange={handleChange}
                            placeholder="orangtua@email.com"
                            className="mt-1 block w-full border border-blue-200 bg-blue-50 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-400"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan & Lanjut ke Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
}
