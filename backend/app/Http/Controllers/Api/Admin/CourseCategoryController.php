<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CourseCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CourseCategoryController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(5, min((int) $request->input('per_page', 15), 100));
        return CourseCategory::ordered()->paginate($perPage);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:course_categories',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
        ]);

        $category = CourseCategory::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name) . '-' . Str::random(3),
            'icon' => $request->icon,
            'color' => $request->color,
            'display_order' => $request->display_order ?? CourseCategory::max('display_order') + 1,
            'is_visible' => $request->is_visible ?? true,
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json(['message' => 'Category created', 'category' => $category]);
    }

    public function update(Request $request, $id)
    {
        $category = CourseCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:course_categories,name,' . $id,
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
        ]);

        $category->update($validated);

        return response()->json(['message' => 'Category updated', 'category' => $category]);
    }

    public function destroy($id)
    {
        $category = CourseCategory::findOrFail($id);
        $category->courses()->update(['category_id' => null]);
        $category->delete();

        return response()->json(['message' => 'Category deleted']);
    }

    public function reorder(Request $request)
    {
        $request->validate([
            'categories' => 'required|array',
            'categories.*.id' => 'required|exists:course_categories,id',
            'categories.*.display_order' => 'required|integer|min:0',
        ]);

        foreach ($request->categories as $item) {
            CourseCategory::where('id', $item['id'])->update(['display_order' => $item['display_order']]);
        }

        return response()->json(['message' => 'Categories reordered']);
    }

    public function toggleActive($id)
    {
        $category = CourseCategory::findOrFail($id);
        $category->is_active = !$category->is_active;
        $category->save();

        return response()->json(['message' => 'Category status toggled', 'is_active' => $category->is_active]);
    }

    public function toggleVisible($id)
    {
        $category = CourseCategory::findOrFail($id);
        $category->is_visible = !$category->is_visible;
        $category->save();

        return response()->json(['message' => 'Category visibility toggled', 'is_visible' => $category->is_visible]);
    }
}
