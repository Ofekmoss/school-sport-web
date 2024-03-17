function Category(value) {
    this.value = value;
    this.gender = value & 0x3;
    this.minAge = ((value >> 2) & 0x7F) || 0;
    this.maxAge = ((value >> 9) & 0x7F) || null;
}

Category.prototype.include  = function (category) {
    if (typeof category === "number") {
        category = new Category(category);
    }

    if (category.gender !== 0 && (category.gender & this.gender) !== this.gender) {
        return false;
    }

    if (category.minAge !== 0 && category.minAge > this.minAge) {
        return false;
    }

    if (category.maxAge != null && (this.maxAge == null || category.maxAge < this.maxAge)) {
        return false;
    }

    return true;
};

Category.male = 1;
Category.female = 2;
Category.both = 3;

Category.convertOldCategory = function (category) {
    if (!category) {
        return category;
    }
    var boys = category & 0xFFFF;
    var girls = (category >> 16) & 0xFFFF;

    var category =
        (boys ? Category.male : 0) |
        (girls ? Category.female : 0);
    var ages = boys | girls;
    var minAge = 0;
    while (ages !== 0 && (ages & 0x1) === 0)
    {
        minAge++;
        ages = ages >> 1;
    }

    ages = ages >> 1;
    var maxAge = minAge;
    while (ages !== 0)
    {
        maxAge++;
        ages = ages >> 1;
    }
    return category | (minAge << 2) | (maxAge << 9);
};

module.exports = Category;